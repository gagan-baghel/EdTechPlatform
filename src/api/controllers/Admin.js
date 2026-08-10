const User = require("../models/User")
const Course = require("../models/Course")
const Payment = require("../models/Payment")
const Order = require("../models/Order")
const AuditLog = require("../models/AuditLog")
const FeatureFlag = require("../models/FeatureFlag")
const Event = require("../models/Event")
const Certificate = require("../models/Certificate")
const { recordAudit } = require("../utils/recordAudit")

const parsePagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25))
  return { page, limit, skip: (page - 1) * limit }
}

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

exports.listUsers = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req)
    const { q, accountType } = req.query

    const filter = {}
    if (accountType) filter.accountType = accountType
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }]
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ _id: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ])

    return res.status(200).json({ success: true, data: users, page, limit, total })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not list users" })
  }
}

// Suspend/reactivate a user. `active` already existed on the User schema
// but was never read anywhere — this is what makes it a real capability
// instead of a dead field. Suspension is enforced at login (see Auth.js).
exports.setUserActive = async (req, res) => {
  try {
    const { userId } = req.params
    const { active } = req.body
    if (typeof active !== "boolean") {
      return res.status(400).json({ success: false, message: "active must be a boolean" })
    }

    const user = await User.findByIdAndUpdate(userId, { active }, { new: true })
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
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
    return res.status(500).json({ success: false, message: "Could not update user" })
  }
}

// ---------------------------------------------------------------------------
// Course moderation
// ---------------------------------------------------------------------------

// Unlike every public course listing, this deliberately does NOT filter
// deletedAt — moderation needs to see soft-deleted courses to restore them.
exports.listCoursesForModeration = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req)
    const { status, includeDeleted } = req.query

    const filter = {}
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
    return res.status(500).json({ success: false, message: "Could not list courses" })
  }
}

// Takedown / restore — the admin-facing counterpart to the instructor
// soft-delete path in Course.js deleteCourse. A takedown never touches
// enrolled students' access, same reasoning as that path.
exports.setCourseTakedown = async (req, res) => {
  try {
    const { courseId } = req.params
    const { takedown, reason } = req.body
    if (typeof takedown !== "boolean") {
      return res.status(400).json({ success: false, message: "takedown must be a boolean" })
    }

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
    return res.status(500).json({ success: false, message: "Could not update course" })
  }
}

// ---------------------------------------------------------------------------
// Payment / order lookup
// ---------------------------------------------------------------------------

exports.lookupPayments = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req)
    const { orderId, email } = req.query

    const filter = {}
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
    return res.status(500).json({ success: false, message: "Could not look up payments" })
  }
}

exports.lookupOrders = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req)
    const { orderId, status } = req.query

    const filter = {}
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
    return res.status(500).json({ success: false, message: "Could not look up orders" })
  }
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

exports.listAuditLog = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req)
    const { action, targetType } = req.query

    const filter = {}
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
    return res.status(500).json({ success: false, message: "Could not load audit log" })
  }
}

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

exports.listFeatureFlags = async (req, res) => {
  try {
    const flags = await FeatureFlag.find({}).sort({ key: 1 }).lean()
    return res.status(200).json({ success: true, data: flags })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not list feature flags" })
  }
}

exports.upsertFeatureFlag = async (req, res) => {
  try {
    const { key, enabled, description, roles } = req.body
    if (!key) {
      return res.status(400).json({ success: false, message: "key is required" })
    }

    const flag = await FeatureFlag.findOneAndUpdate(
      { key },
      {
        $set: {
          enabled: Boolean(enabled),
          description,
          roles: Array.isArray(roles) ? roles : [],
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
    return res.status(500).json({ success: false, message: "Could not update feature flag" })
  }
}

// ---------------------------------------------------------------------------
// System health — extends the plain /health check with the dependencies
// that actually matter operationally. /health only confirms the function
// booted; this confirms Mongo is actually reachable and returning data.
// ---------------------------------------------------------------------------

exports.systemHealth = async (req, res) => {
  const checks = {}

  try {
    await User.estimatedDocumentCount()
    checks.database = "ok"
  } catch (error) {
    checks.database = "unreachable"
  }

  checks.cloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  )
  checks.mailConfigured = Boolean(
    process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS
  )
  checks.razorpayConfigured = Boolean(process.env.RAZORPAY_KEY && process.env.RAZORPAY_SECRET)
  checks.webhookConfigured = Boolean(process.env.WEBHOOK_SECRET)

  const healthy = checks.database === "ok"

  return res.status(healthy ? 200 : 503).json({ success: healthy, checks })
}

// ---------------------------------------------------------------------------
// Business intelligence — reads from data already being written (Payment,
// Order, Event, CourseProgress, Certificate). No new pipeline: these are
// plain aggregation queries run on read, per the plan's own reasoning
// ("do not build a pipeline until the dashboards justify it") — this IS
// that dashboard.
// ---------------------------------------------------------------------------

exports.analyticsOverview = async (req, res) => {
  try {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [
      revenueTotal,
      revenueByDay,
      funnelCounts,
      refundStats,
      topCourses,
      certificateCount,
      enrollmentCount,
      aiInteractionCount,
    ] = await Promise.all([
      Payment.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.aggregate([
        { $match: { date: { $gte: since30d } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, total: { $sum: "$amount" } } },
        { $sort: { _id: 1 } },
      ]),
      Promise.all([
        Event.countDocuments({ verb: "course_viewed", timestamp: { $gte: since30d } }),
        Event.countDocuments({ verb: "checkout_started", timestamp: { $gte: since30d } }),
        Event.countDocuments({ verb: "purchase_completed", timestamp: { $gte: since30d } }),
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
    ])

    const [viewed, checkoutStarted, purchased] = funnelCounts
    const refundedCount = refundStats.find((s) => s._id === "refunded")?.count || 0
    const paidCount = refundStats.find((s) => s._id === "paid")?.count || 0

    return res.status(200).json({
      success: true,
      data: {
        revenueTotalRupees: (revenueTotal[0]?.total || 0),
        revenueByDay: revenueByDay.map((r) => ({ date: r._id, amountRupees: r.total })),
        funnel: { viewed, checkoutStarted, purchased },
        refundRate: paidCount > 0 ? Math.round((refundedCount / (paidCount + refundedCount)) * 10000) / 100 : 0,
        topCourses,
        completionRate:
          enrollmentCount[0]?.total > 0
            ? Math.round((certificateCount / enrollmentCount[0].total) * 10000) / 100
            : 0,
        aiInteractionCount,
      },
    })
  } catch (error) {
    console.error("analyticsOverview failed", error)
    return res.status(500).json({ success: false, message: "Could not load analytics" })
  }
}
