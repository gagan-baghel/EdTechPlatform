/**
 * One-shot index migration. Run manually, NOT from application code:
 *
 *   node scripts/ensure-indexes.js
 *
 * autoIndex is off (see src/api/config/connectDB.js) specifically so a cold
 * start never attempts to build these indexes against unresolved duplicate
 * data and crash the function. This script is the sole index authority: it
 * dedupes each collection, THEN creates the unique index, in that order.
 *
 * Idempotent — safe to re-run. A clean run reports 0 duplicates found and
 * "already exists" for every index.
 *
 * Deploy ordering (hard constraint): run this against production BEFORE
 * deploying the commit that added unique:true to the User/Payment/
 * CourseProgress/RatingAndReview models. Running it after does nothing to
 * prevent the crash the ordering is meant to avoid.
 */

const mongoose = require("mongoose")
const { connectDB } = require("../src/api/config/connectDB")

const User = require("../src/api/models/User")
const Payment = require("../src/api/models/Payment")
const CourseProgress = require("../src/api/models/CourseProgress")
const RatingAndReview = require("../src/api/models/RatingAndReview")
const Course = require("../src/api/models/Course")
const Order = require("../src/api/models/Order")

const log = (...args) => console.log("[ensure-indexes]", ...args)

/**
 * Groups a collection by `keyFields`, finds groups with more than one
 * document, and returns each group's document ids sorted ascending by _id
 * (i.e. insertion order for ObjectIds).
 */
async function findDuplicateGroups(Model, keyFields) {
  const groupId = {}
  for (const field of keyFields) groupId[field] = `$${field}`

  return Model.aggregate([
    { $group: { _id: groupId, ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ])
}

/**
 * users.email — cannot be auto-resolved. Both accounts may hold real
 * purchases; merging or deleting either is a decision only a human should
 * make. Report and abort without creating the index.
 */
async function dedupeUsers() {
  const dupes = await findDuplicateGroups(User, ["email"])

  if (dupes.length === 0) {
    log("users: no duplicate emails")
    return true
  }

  console.error(
    `\n[ensure-indexes] ABORTING — ${dupes.length} duplicate email(s) found. ` +
      "These accounts may both hold purchases; resolve manually, then re-run.\n"
  )
  for (const group of dupes) {
    console.error(`  ${group._id.email}: ${group.ids.map(String).join(", ")}`)
  }
  return false
}

/**
 * payments {orderId, consumer} — pure duplicate history rows, no inbound
 * refs from any other collection. Keep the lowest _id, delete the rest.
 */
async function dedupePayments() {
  const dupes = await findDuplicateGroups(Payment, ["orderId", "consumer"])
  if (dupes.length === 0) {
    log("payments: no duplicates")
    return
  }

  let deleted = 0
  for (const group of dupes) {
    const sorted = group.ids.slice().sort((a, b) => a.toString().localeCompare(b.toString()))
    const [, ...losers] = sorted
    await Payment.deleteMany({ _id: { $in: losers } })
    deleted += losers.length
  }
  log(`payments: deduped ${dupes.length} group(s), deleted ${deleted} row(s)`)
}

/**
 * courseprogresses {courseID, userId} — User.courseProgress holds these
 * ids by reference, so this is not a plain delete: union completedVideos
 * into the surviving document, then repoint every user's reference before
 * removing the losers.
 */
async function dedupeCourseProgress() {
  const dupes = await findDuplicateGroups(CourseProgress, ["courseID", "userId"])
  if (dupes.length === 0) {
    log("courseprogresses: no duplicates")
    return
  }

  let deleted = 0
  for (const group of dupes) {
    const sorted = group.ids.slice().sort((a, b) => a.toString().localeCompare(b.toString()))
    const [survivorId, ...loserIds] = sorted

    const losers = await CourseProgress.find({ _id: { $in: loserIds } }).lean()
    const allCompleted = losers.flatMap((doc) => doc.completedVideos || [])

    if (allCompleted.length > 0) {
      await CourseProgress.updateOne(
        { _id: survivorId },
        { $addToSet: { completedVideos: { $each: allCompleted } } }
      )
    }

    await CourseProgress.deleteMany({ _id: { $in: loserIds } })

    await User.updateOne(
      { _id: group._id.userId },
      {
        $pull: { courseProgress: { $in: loserIds } },
        $addToSet: { courseProgress: survivorId },
      }
    )

    deleted += loserIds.length
  }
  log(`courseprogresses: deduped ${dupes.length} group(s), deleted ${deleted} row(s)`)
}

/**
 * ratingandreviews {user, course} — Course.ratingAndReviews holds these
 * ids by reference. Keep the HIGHEST _id (the user's most recent review is
 * their real intent), repoint the course's array, then delete the losers.
 */
async function dedupeRatingAndReview() {
  const dupes = await findDuplicateGroups(RatingAndReview, ["user", "course"])
  if (dupes.length === 0) {
    log("ratingandreviews: no duplicates")
    return
  }

  let deleted = 0
  for (const group of dupes) {
    const sorted = group.ids.slice().sort((a, b) => a.toString().localeCompare(b.toString()))
    const loserIds = sorted.slice(0, -1) // all but the highest

    await Course.updateOne(
      { _id: group._id.course },
      { $pull: { ratingAndReviews: { $in: loserIds } } }
    )
    await RatingAndReview.deleteMany({ _id: { $in: loserIds } })

    deleted += loserIds.length
  }
  log(`ratingandreviews: deduped ${dupes.length} group(s), deleted ${deleted} row(s)`)
}

async function createIndexSafely(Model, spec, options, label) {
  try {
    await Model.collection.createIndex(spec, options)
    log(`${label}: index ready`)
  } catch (error) {
    console.error(`[ensure-indexes] FAILED creating index ${label}:`, error.message)
    throw error
  }
}

async function main() {
  await connectDB()
  log("connected")

  const usersOk = await dedupeUsers()
  if (!usersOk) {
    await mongoose.connection.close()
    process.exit(1)
  }

  await dedupePayments()
  await dedupeCourseProgress()
  await dedupeRatingAndReview()

  await createIndexSafely(User, { email: 1 }, { unique: true }, "users.email")
  await createIndexSafely(
    Payment,
    { orderId: 1, consumer: 1 },
    { unique: true },
    "payments.{orderId,consumer}"
  )
  await createIndexSafely(
    CourseProgress,
    { courseID: 1, userId: 1 },
    { unique: true },
    "courseprogresses.{courseID,userId}"
  )
  await createIndexSafely(
    RatingAndReview,
    { user: 1, course: 1 },
    { unique: true },
    "ratingandreviews.{user,course}"
  )
  // Declared unique:true in the Order model already — verify it actually
  // exists rather than assume autoIndex built it before it was turned off.
  await createIndexSafely(Order, { orderId: 1 }, { unique: true }, "orders.orderId")

  // Not a uniqueness constraint — no dedupe needed, just create it. This is
  // what makes searchCourses' $text query actually use an index instead of
  // always falling back to the regex scan.
  await createIndexSafely(
    Course,
    { courseName: "text", courseDescription: "text", whatYouWillLearn: "text", tag: "text" },
    { weights: { courseName: 10, tag: 5, courseDescription: 1, whatYouWillLearn: 1 }, name: "course_text_search" },
    "courses.text_search"
  )

  log("done")
  await mongoose.connection.close()
  process.exit(0)
}

main().catch((error) => {
  console.error("[ensure-indexes] FAILED:", error)
  process.exit(1)
})
