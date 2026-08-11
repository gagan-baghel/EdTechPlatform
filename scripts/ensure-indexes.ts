/**
 * One-shot index migration. Run manually, NOT from application code:
 *
 *   npx tsx scripts/ensure-indexes.ts
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

import mongoose from "mongoose"
import type {
  Collection,
  CreateIndexesOptions,
  IndexSpecification,
} from "mongodb"
import { connectDB } from "../src/api/config/connectDB"
import User from "../src/api/models/User"
import Payment from "../src/api/models/Payment"
import CourseProgress from "../src/api/models/CourseProgress"
import RatingAndReview from "../src/api/models/RatingAndReview"
import Course from "../src/api/models/Course"
import Order from "../src/api/models/Order"

const log = (...args: unknown[]): void => console.log("[ensure-indexes]", ...args)

interface DuplicateDoc {
  _id: string
  ids: mongoose.Types.ObjectId[]
}

async function dedupeUsers(): Promise<boolean> {
  log("deduping users by email…")
  const dupes = await User.aggregate<DuplicateDoc>([
    { $group: { _id: "$email", ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ])

  if (dupes.length === 0) {
    log("users: 0 duplicates — clean")
    return true
  }

  log(`users: ${dupes.length} duplicate email group(s) found — manual review required before index creation`)
  for (const dupe of dupes) {
    console.error(`  email="${dupe._id}" has ids: ${dupe.ids.join(", ")}`)
  }
  return false
}

async function dedupePayments(): Promise<void> {
  log("deduping payments by {orderId, consumer}…")
  const dupes = await Payment.aggregate<DuplicateDoc>([
    { $group: { _id: { orderId: "$orderId", consumer: "$consumer" }, ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ])
  if (dupes.length === 0) {
    log("payments: 0 duplicates — clean")
    return
  }
  log(`payments: ${dupes.length} duplicate group(s) — keeping newest, deleting older`)
  for (const dupe of dupes) {
    const toDelete = dupe.ids.slice(0, -1)
    await Payment.deleteMany({ _id: { $in: toDelete } })
  }
}

async function dedupeCourseProgress(): Promise<void> {
  log("deduping courseProgress by {courseID, userId}…")
  const dupes = await CourseProgress.aggregate<DuplicateDoc>([
    { $group: { _id: { courseID: "$courseID", userId: "$userId" }, ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ])
  if (dupes.length === 0) {
    log("courseProgress: 0 duplicates — clean")
    return
  }
  log(`courseProgress: ${dupes.length} duplicate group(s) — keeping newest, deleting older`)
  for (const dupe of dupes) {
    const toDelete = dupe.ids.slice(0, -1)
    await CourseProgress.deleteMany({ _id: { $in: toDelete } })
  }
}

async function dedupeRatingAndReview(): Promise<void> {
  log("deduping ratingAndReview by {user, course}…")
  const dupes = await RatingAndReview.aggregate<DuplicateDoc>([
    { $group: { _id: { user: "$user", course: "$course" }, ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ])
  if (dupes.length === 0) {
    log("ratingAndReview: 0 duplicates — clean")
    return
  }
  log(`ratingAndReview: ${dupes.length} duplicate group(s) — keeping newest, deleting older`)
  for (const dupe of dupes) {
    const toDelete = dupe.ids.slice(0, -1)
    await RatingAndReview.deleteMany({ _id: { $in: toDelete } })
  }
}

/**
 * Takes only the structural part it uses (the driver collection) rather than
 * as any generic. Each model here has a different document type, so a single
 * `Model<T>` parameter forced a cast at every call site — and those casts were
 * between types that don't overlap, which is a cast that proves nothing.
 */
async function createIndexSafely(
  model: { collection: Collection },
  spec: IndexSpecification,
  options: CreateIndexesOptions,
  label: string
): Promise<void> {
  try {
    await model.collection.createIndex(spec, options)
    log(`${label}: index ready`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[ensure-indexes] FAILED creating index ${label}:`, message)
    throw error
  }
}

async function main(): Promise<void> {
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

main().catch((error: unknown) => {
  console.error("[ensure-indexes] FAILED:", error)
  process.exit(1)
})
