import { z } from "zod"
import { fail, parseOrThrow } from "../lib/respond"
import type { Request, Response } from "express"
import { getEnv } from "../config/env"
import type { AuthedRequest } from "../lib/http"
import User from "../models/User"
import Session from "../models/Session"
import Course from "../models/Course"
import Payment from "../models/Payment"
import Order from "../models/Order"
import AuditLog from "../models/AuditLog"
import FeatureFlag from "../models/FeatureFlag"
import Event from "../models/Event"
import Certificate from "../models/Certificate"
import CourseProgress from "../models/CourseProgress"
import AIInteraction from "../models/AIInteraction"
import QuizAttempt from "../models/QuizAttempt"
import SubSection from "../models/SubSection"
import Payout from "../models/Payout"
import InstructorPayoutProfile from "../models/InstructorPayoutProfile"
import { dayKeys, sinceDays, zeroFill } from "../lib/analytics"
import { recordAudit } from "../utils/recordAudit"

const parsePagination = (req: Request) => {
  const { page, limit } = parseOrThrow(
    z.object({
      page: z.coerce.number().int().min(1).catch(1),
      limit: z.coerce.number().int().min(1).max(100).catch(25),
    }),
    req.query
  )
  return { page, limit, skip: (page - 1) * limit }
}

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

export const listUsers = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req)
    // Validating req.query via Zod prevents NoSQL injection: a caller
    // can send ?accountType[$ne]=Admin, which Express parses into an OBJECT.
    // Zod enforces it is a string, so an operator cannot bypass the schema.
    const { q, accountType } = parseOrThrow(
      z.object({
        q: z.string().optional(),
        accountType: z.string().optional(),
      }),
      req.query
    )

    const filter: Record<string, unknown> = {}
    if (accountType) filter.accountType = accountType
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }]
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -token")
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ])

    return res.status(200).json({ success: true, data: users, page, limit, total })
  } catch (error) {
    return fail(res, error, "listUsers", "Could not list users")
  }
}

// Suspend/reactivate a user. `active` already existed on the User schema
// but was never read anywhere — this is what makes it a real capability
// instead of a dead field. Suspension is enforced at login (see Auth.js).
export const setUserActive = async (req: AuthedRequest, res: Response) => {
  try {
    const { userId } = parseOrThrow(
      z.object({ userId: z.string() }),
      req.params
    )
    const { active } = parseOrThrow(
      z.object({
        active: z.boolean({ message: "active must be a boolean" }),
      }),
      req.body
    )

    // An admin must not be able to lock themselves — or the last admin — out.
    if (!active && userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot suspend your own account.",
      })
    }

    const user = await User.findByIdAndUpdate(userId, { active }, { new: true })
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    /**
     * Suspension has to end the sessions too.
     *
     * `active` is only checked at login, so suspending a signed-in user left
     * every token they already held working for its full 24h — they kept
     * browsing, kept buying, kept posting, for a day after being suspended.
     * Revoking their sessions is what makes the suspension take effect now.
     */
    if (!active) {
      await Session.updateMany({ user: userId }, { $set: { revoked: true } })
    }

    await recordAudit({
      actor: req.user.id,
      action: active ? "user.reactivate" : "user.suspend",
      targetType: "User",
      targetId: userId,
      details: { email: user.email },
    })

    return res.status(200).json({ success: true, message: "User updated" })
  } catch (error) {
    return fail(res, error, "setUserActive", "Could not update user")
  }
}

// ---------------------------------------------------------------------------
// Course moderation
// ---------------------------------------------------------------------------

// Unlike every public course listing, this deliberately does NOT filter
// deletedAt — moderation needs to see soft-deleted courses to restore them.
export const listCoursesForModeration = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req)
    const { status, includeDeleted } = parseOrThrow(
      z.object({
        status: z.string().optional(),
        includeDeleted: z.string().optional(),
      }),
      req.query
    )

    const filter: Record<string, unknown> = {}
    if (status) filter.status = status
    if (includeDeleted !== "true") filter.deletedAt = null

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .select("courseName status price deletedAt studentsEnrolled instructor createdAt")
        .populate("instructor", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments(filter),
    ])

    return res.status(200).json({ success: true, data: courses, page, limit, total })
  } catch (error) {
    return fail(res, error, "listCoursesForModeration", "Could not list courses")
  }
}

// Takedown / restore — the admin-facing counterpart to the instructor
// soft-delete path in Course.js deleteCourse. A takedown never touches
// enrolled students' access, same reasoning as that path.
export const setCourseTakedown = async (req: AuthedRequest, res: Response) => {
  try {
    const { courseId } = parseOrThrow(
      z.object({ courseId: z.string() }),
      req.params
    )
    const { takedown, reason } = parseOrThrow(
      z.object({
        takedown: z.boolean({ message: "takedown must be a boolean" }),
        reason: z.string().optional(),
      }),
      req.body
    )

    const course = await Course.findByIdAndUpdate(
      courseId,
      { deletedAt: takedown ? new Date() : null },
      { new: true }
    )
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" })
    }

    await recordAudit({
      actor: req.user.id,
      action: takedown ? "course.takedown" : "course.restore",
      targetType: "Course",
      targetId: courseId,
      details: { courseName: course.courseName, reason },
    })

    return res.status(200).json({ success: true, message: "Course updated" })
  } catch (error) {
    return fail(res, error, "setCourseTakedown", "Could not update course")
  }
}

// ---------------------------------------------------------------------------
// Payment / order lookup
// ---------------------------------------------------------------------------

export const lookupPayments = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req)
    const { orderId, email } = parseOrThrow(
      z.object({
        orderId: z.string().max(100).optional(),
        // Lowercased to match how addresses are stored — an admin typing
        // "A@x.com" otherwise silently found nothing.
        email: z.string().trim().toLowerCase().max(200).optional(),
      }),
      req.query
    )

    const filter: Record<string, unknown> = {}
    if (orderId) filter.orderId = orderId
    if (email) {
      const user = await User.findOne({ email }).select("_id").lean()
      filter.consumer = user?._id ?? null
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("consumer", "firstName lastName email")
        .populate("courses", "courseName")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
    ])

    return res.status(200).json({ success: true, data: payments, page, limit, total })
  } catch (error) {
    return fail(res, error, "lookupPayments", "Could not look up payments")
  }
}

export const lookupOrders = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req)
    const { orderId, status } = parseOrThrow(
      z.object({
        orderId: z.string().optional(),
        status: z.string().optional(),
      }),
      req.query
    )

    const filter: Record<string, unknown> = {}
    if (orderId) filter.orderId = orderId
    if (status) filter.status = status

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("user", "firstName lastName email")
        .populate("courses", "courseName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ])

    return res.status(200).json({ success: true, data: orders, page, limit, total })
  } catch (error) {
    return fail(res, error, "lookupOrders", "Could not look up orders")
  }
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export const listAuditLog = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req)
    const { action, targetType } = parseOrThrow(
      z.object({
        action: z.string().optional(),
        targetType: z.string().optional(),
      }),
      req.query
    )

    const filter: Record<string, unknown> = {}
    if (action) filter.action = action
    if (targetType) filter.targetType = targetType

    const [entries, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("actor", "firstName lastName email")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ])

    return res.status(200).json({ success: true, data: entries, page, limit, total })
  } catch (error) {
    return fail(res, error, "listAuditLog", "Could not load audit log")
  }
}

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

export const listFeatureFlags = async (req: Request, res: Response) => {
  try {
    const flags = await FeatureFlag.find({}).sort({ key: 1 }).limit(500).lean()
    return res.status(200).json({ success: true, data: flags })
  } catch (error) {
    return fail(res, error, "listFeatureFlags", "Could not list feature flags")
  }
}

export const upsertFeatureFlag = async (req: AuthedRequest, res: Response) => {
  try {
    const { key, enabled, description, roles } = parseOrThrow(
      z.object({
        key: z.string().min(1, "key is required"),
        enabled: z.boolean().optional(),
        description: z.string().optional(),
        roles: z.array(z.string()).optional(),
      }),
      req.body
    )

    const flag = await FeatureFlag.findOneAndUpdate(
      { key },
      {
        $set: {
          enabled: enabled ?? false,
          description,
          roles: roles ?? [],
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    )

    await recordAudit({
      actor: req.user.id,
      action: "feature_flag.update",
      targetType: "FeatureFlag",
      targetId: key,
      details: { enabled: flag.enabled, roles: flag.roles },
    })

    return res.status(200).json({ success: true, data: flag })
  } catch (error) {
    return fail(res, error, "upsertFeatureFlag", "Could not update feature flag")
  }
}

// ---------------------------------------------------------------------------
// System health — extends the plain /health check with the dependencies
// that actually matter operationally. /health only confirms the function
// booted; this confirms Mongo is actually reachable and returning data.
// ---------------------------------------------------------------------------

export const systemHealth = async (req: Request, res: Response) => {
  const checks: Record<string, unknown> = {}
  const env = getEnv()

  const pingStart = Date.now()
  try {
    await User.estimatedDocumentCount()
    checks.database = "ok"
  } catch {
    checks.database = "unreachable"
  }
  const databaseLatencyMs = Date.now() - pingStart

  checks.cloudinaryConfigured = Boolean(
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
  )
  checks.mailConfigured = Boolean(env.MAIL_HOST && env.MAIL_USER && env.MAIL_PASS)
  checks.razorpayConfigured = Boolean(env.RAZORPAY_KEY && env.RAZORPAY_SECRET)
  checks.webhookConfigured = Boolean(env.WEBHOOK_SECRET)
  checks.cronConfigured = Boolean(env.CRON_SECRET)
  checks.encryptionConfigured = Boolean(env.FIELD_ENCRYPTION_KEY)
  checks.aiTutorConfigured = Boolean(env.ANTHROPIC_API_KEY)
  checks.transcriptionConfigured = Boolean(env.OPENAI_API_KEY)

  const healthy = checks.database === "ok"

  // Work that is stuck or waiting on a human. Each is a count an operator can
  // act on from another tab; skipped when the database itself is down.
  let attention: Record<string, number> | null = null
  if (healthy) {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const [failedTranscripts, pendingKyc, pendingPayouts, aiFailures24h, aiCalls24h, abandonedCheckouts24h] =
      await Promise.all([
        SubSection.countDocuments({ transcriptStatus: "failed" }),
        InstructorPayoutProfile.countDocuments({ kycStatus: "pending" }),
        Payout.countDocuments({ status: "pending" }),
        AIInteraction.countDocuments({ succeeded: false, createdAt: { $gte: dayAgo } }),
        AIInteraction.countDocuments({ createdAt: { $gte: dayAgo } }),
        Order.countDocuments({ status: "created", createdAt: { $gte: dayAgo, $lte: hourAgo } }),
      ])
    attention = { failedTranscripts, pendingKyc, pendingPayouts, aiFailures24h, aiCalls24h, abandonedCheckouts24h }
  }

  return res.status(healthy ? 200 : 503).json({
    success: healthy,
    checks,
    databaseLatencyMs,
    attention,
    checkedAt: new Date().toISOString(),
  })
}

// ---------------------------------------------------------------------------
// Business intelligence — reads from data already being written (Payment,
// Order, Event, CourseProgress, Certificate). No new pipeline: these are
// plain aggregation queries run on read, per the plan's own reasoning
// ("do not build a pipeline until the dashboards justify it") — this IS
// that dashboard.
// ---------------------------------------------------------------------------

const AnalyticsRangeSchema = z.object({
  days: z.enum(["7", "30", "90"]).catch("30").transform(Number),
})

const byDay = (field: string) => ({ $dateToString: { format: "%Y-%m-%d", date: field } })

export const analyticsOverview = async (req: Request, res: Response) => {
  try {
    const { days } = parseOrThrow(AnalyticsRangeSchema, req.query)
    const since = sinceDays(days)
    const keys = dayKeys(days)

    const [
      revenueTotal,
      revenueByDay,
      funnelCounts,
      refundStats,
      topCourses,
      certificateCount,
      enrollmentCount,
      aiInteractionCount,
      signupsByDay,
      activeByDay,
      enrollmentsByDay,
      aiByDay,
      usersByRole,
      coursesByStatus,
      quizStats,
    ] = await Promise.all([
      Payment.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.aggregate<{ _id: string; total: number }>([
        { $match: { date: { $gte: since } } },
        { $group: { _id: byDay("$date"), total: { $sum: "$amount" } } },
      ]),
      Promise.all([
        Event.countDocuments({ verb: "course_viewed", timestamp: { $gte: since } }),
        Event.countDocuments({ verb: "checkout_started", timestamp: { $gte: since } }),
        Event.countDocuments({ verb: "purchase_completed", timestamp: { $gte: since } }),
      ]),
      Order.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $unwind: "$courses" },
        { $group: { _id: "$courses", revenue: { $sum: "$amount" }, sales: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        {
          $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "course" },
        },
        { $unwind: "$course" },
        { $project: { courseName: "$course.courseName", revenue: 1, sales: 1 } },
      ]),
      Certificate.countDocuments({}),
      User.aggregate([{ $project: { count: { $size: { $ifNull: ["$courses", []] } } } }, { $group: { _id: null, total: { $sum: "$count" } } }]),
      Event.countDocuments({ verb: "ai_interaction" }),
      // User has no createdAt, but every ObjectId carries its creation time.
      User.aggregate<{ _id: string; count: number }>([
        { $project: { created: { $toDate: "$_id" } } },
        { $match: { created: { $gte: since } } },
        { $group: { _id: byDay("$created"), count: { $sum: 1 } } },
      ]),
      Event.aggregate<{ _id: string; count: number }>([
        { $match: { timestamp: { $gte: since }, actor: { $ne: null } } },
        { $group: { _id: { day: byDay("$timestamp"), actor: "$actor" } } },
        { $group: { _id: "$_id.day", count: { $sum: 1 } } },
      ]),
      CourseProgress.aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: byDay("$createdAt"), count: { $sum: 1 } } },
      ]),
      AIInteraction.aggregate<{ _id: string; ok: number; failed: number }>([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: byDay("$createdAt"),
            ok: { $sum: { $cond: ["$succeeded", 1, 0] } },
            failed: { $sum: { $cond: ["$succeeded", 0, 1] } },
          },
        },
      ]),
      User.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$accountType", count: { $sum: 1 } } }]),
      Course.aggregate<{ _id: string; count: number }>([
        { $match: { deletedAt: null } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      QuizAttempt.aggregate<{ _id: null; attempts: number; passed: number; avgScore: number }>([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            attempts: { $sum: 1 },
            passed: { $sum: { $cond: ["$passed", 1, 0] } },
            avgScore: { $avg: "$scorePercent" },
          },
        },
      ]),
    ])

    const [viewed, checkoutStarted, purchased] = funnelCounts
    const refundedCount = refundStats.find((s) => s._id === "refunded")?.count || 0
    const paidCount = refundStats.find((s) => s._id === "paid")?.count || 0
    const count = (row: { count: number } | undefined) => row?.count ?? 0
    const quiz = quizStats[0]

    return res.status(200).json({
      success: true,
      data: {
        rangeDays: days,
        revenueTotalRupees: (revenueTotal[0]?.total || 0),
        revenueByDay: zeroFill(keys, revenueByDay, (r, date) => ({ date, amountRupees: r?.total ?? 0 })),
        funnel: { viewed, checkoutStarted, purchased },
        refundRate: paidCount > 0 ? Math.round((refundedCount / (paidCount + refundedCount)) * 10000) / 100 : 0,
        topCourses,
        completionRate:
          enrollmentCount[0]?.total > 0
            ? Math.round((certificateCount / enrollmentCount[0].total) * 10000) / 100
            : 0,
        aiInteractionCount,
        growthByDay: keys.map((date) => ({
          date,
          signups: count(signupsByDay.find((r) => r._id === date)),
          activeUsers: count(activeByDay.find((r) => r._id === date)),
          enrollments: count(enrollmentsByDay.find((r) => r._id === date)),
        })),
        aiByDay: zeroFill(keys, aiByDay, (r, date) => ({ date, succeeded: r?.ok ?? 0, failed: r?.failed ?? 0 })),
        usersByRole: Object.fromEntries(usersByRole.map((r) => [r._id, r.count])),
        coursesByStatus: Object.fromEntries(coursesByStatus.map((r) => [r._id, r.count])),
        quizzes: {
          attempts: quiz?.attempts ?? 0,
          passRate: quiz?.attempts ? Math.round((quiz.passed / quiz.attempts) * 100) : null,
          averageScore: quiz?.attempts ? Math.round(quiz.avgScore) : null,
        },
      },
    })
  } catch (error) {
    return fail(res, error, "analyticsOverview", "Could not load analytics")
  }
}
