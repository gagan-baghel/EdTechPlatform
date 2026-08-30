/**
 * Index and data migration. Run manually, NOT from application code:
 *
 *   npm run migrate:indexes
 *
 * autoIndex is off (see src/api/config/connectDB.ts) specifically so a cold
 * start never attempts to build these indexes against unresolved duplicate
 * data and crash the function. This script is the sole index authority: it
 * cleans each collection, THEN creates the index, in that order.
 *
 * Idempotent — safe to re-run any number of times. A clean run reports
 * 0 duplicates found and "index ready" for every index.
 *
 * Deploy ordering (hard constraint): run this against production BEFORE
 * deploying the commit that added unique:true to the User/Payment/
 * CourseProgress/RatingAndReview models. Running it after does nothing to
 * prevent the crash the ordering is meant to avoid.
 *
 * It also owns the TTL indexes. Those were previously declared in schemas and
 * never created anywhere, which is what made the rate limiter a permanent
 * account lockout and stopped OTPs from ever expiring — see the TTL block in
 * `main()`.
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
import OTP from "../src/api/models/OTP"
import Session from "../src/api/models/Session"
import Referral from "../src/api/models/Referral"
import Certificate from "../src/api/models/Certificate"

const log = (...args: unknown[]): void => console.log("[ensure-indexes]", ...args)

interface DuplicateDoc {
  _id: string
  ids: mongoose.Types.ObjectId[]
}

/**
 * Users are keyed by email, and the unique index on it is byte-exact.
 *
 * `User.email` now has `lowercase: true`, so new writes are normalised — but
 * rows written before that are not, and "A@x.com" and "a@x.com" would both
 * survive a byte-exact unique index while being the same account to every
 * human and to the login form. This groups case-insensitively, refuses to
 * continue if that surfaces genuine duplicates (merging two accounts' courses,
 * payments and progress is a decision, not a script), and otherwise rewrites
 * the stragglers to lowercase.
 *
 * Idempotent: a second run finds nothing to change.
 */
async function dedupeUsers(): Promise<boolean> {
  log("checking users for case-insensitive duplicate emails…")
  const dupes = await User.aggregate<DuplicateDoc>([
    { $group: { _id: { $toLower: "$email" }, ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ])

  if (dupes.length > 0) {
    log(
      `users: ${dupes.length} duplicate email group(s) found — manual review required before index creation`
    )
    for (const dupe of dupes) {
      console.error(`  email="${dupe._id}" has ids: ${dupe.ids.join(", ")}`)
    }
    return false
  }

  const notNormalised = await User.find({
    $expr: { $ne: ["$email", { $toLower: "$email" }] },
  })
    .select("_id email")
    .lean()

  if (notNormalised.length === 0) {
    log("users: 0 duplicates, all emails already lowercase — clean")
    return true
  }

  log(`users: normalising ${notNormalised.length} mixed-case email(s) to lowercase`)
  for (const user of notNormalised) {
    await User.updateOne({ _id: user._id }, { $set: { email: user.email.toLowerCase() } })
  }
  return true
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

  // Catalogue reads are always "published, not deleted, in this category" —
  // without this compound index they fall back to a collection scan filtered in
  // memory. Declared in the Course schema (Course.ts) but autoIndex is off, so
  // this script is the sole authority for creating it in production.
  await createIndexSafely(
    Course,
    { status: 1, deletedAt: 1, category: 1 },
    {},
    "courses.{status,deletedAt,category}"
  )

  // Backs the instructor's own course list (/dashboard/my-courses).
  await createIndexSafely(
    Course,
    { instructor: 1, deletedAt: 1 },
    {},
    "courses.{instructor,deletedAt}"
  )

  /* ------------------------------------------------------------------ *
   * TTL indexes.
   *
   * These were declared in the schemas and never created here, and with
   * autoIndex off that means they did not exist in any deployed database.
   * The consequences were not cosmetic:
   *
   *  - rateLimits: nothing ever expired a window, so `hits` incremented
   *    forever and any account that reached ten failed logins was locked
   *    out of the platform permanently. (The limiter now also resets the
   *    window in code, so it no longer depends on this index for
   *    correctness — this reclaims the storage.)
   *  - otps: verification codes never expired. (Also now checked in code.)
   *  - sessions: one document per login, kept forever, and every browser a
   *    user had ever signed in from listed as an active device.
   * ------------------------------------------------------------------ */
  await createIndexSafely(
    OTP,
    { createdAt: 1 },
    { expireAfterSeconds: 5 * 60 },
    "otps.createdAt (TTL 5m)"
  )
  await createIndexSafely(
    Session,
    { createdAt: 1 },
    { expireAfterSeconds: 48 * 60 * 60 },
    "sessions.createdAt (TTL 48h)"
  )
  await createIndexSafely(Session, { jti: 1 }, { unique: true }, "sessions.jti")
  await createIndexSafely(
    Session,
    { user: 1, revoked: 1 },
    {},
    "sessions.{user,revoked}"
  )

  // The rate-limit collection is defined inside the middleware rather than in
  // models/, so it is reached through the driver by name.
  const rateLimits = mongoose.connection.collection("ratelimits")
  await createIndexSafely(
    { collection: rateLimits },
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
    "ratelimits.expiresAt (TTL)"
  )
  await createIndexSafely(
    { collection: rateLimits },
    { key: 1 },
    { unique: true },
    "ratelimits.key"
  )

  // Referral commission is credited once per {referrer, order}; the
  // duplicate-key error is what makes a settle retry a no-op instead of
  // paying an affiliate twice for the same purchase.
  await createIndexSafely(
    Referral,
    { referrer: 1, orderId: 1 },
    { unique: true },
    "referrals.{referrer,orderId}"
  )

  // Certificates are issued at most once per {user, course} — the unique
  // index is what makes checkAndIssueCertificate safe to call on every
  // progress heartbeat.
  await createIndexSafely(
    Certificate,
    { user: 1, course: 1 },
    { unique: true },
    "certificates.{user,course}"
  )

  log("done")
  await mongoose.connection.close()
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error("[ensure-indexes] FAILED:", error)
  process.exit(1)
})
