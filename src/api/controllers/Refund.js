const { instance } = require("../config/razorpay")
const Payment = require("../models/Payment")
const Order = require("../models/Order")
const Course = require("../models/Course")
const User = require("../models/User")
const CourseProgress = require("../models/CourseProgress")
const Refund = require("../models/Refund")
const { recordAudit } = require("../utils/recordAudit")
const { emitEvent, EVENT_VERBS } = require("../utils/emitEvent")

// Outcome-accountability refund policy (plan §1): a student who hasn't
// made meaningful progress within this window is owed a refund, not just
// permitted to ask for one. Both numbers are deliberately simple constants
// rather than admin-configurable settings — turning this into a real
// per-course/per-instructor policy is a product decision for later, not
// something to invent unilaterally as a side effect of building the
// refund pipeline.
const REFUND_DEADLINE_DAYS = 30
const REFUND_ELIGIBLE_COMPLETION_THRESHOLD = 0.5 // below 50% complete

/**
 * Reverses the enrolment side of a purchase — the counterpart to
 * enrollStudents in Payments.js. Progress is intentionally left in place
 * rather than deleted: if the refund is disputed or reversed, the record
 * of what they'd actually done shouldn't vanish along with their access.
 */
async function unenrollFromCourses(userId, courseIds) {
  await Course.updateMany(
    { _id: { $in: courseIds } },
    { $pull: { studentsEnrolled: userId } }
  )
  await User.findByIdAndUpdate(userId, { $pull: { courses: { $in: courseIds } } })
}

/**
 * Issues a real refund via Razorpay against an existing Payment record,
 * unenrolls the student, and marks the order refunded. Always
 * admin-triggered — see the doc comment on the Refund model for why this
 * stays a reviewed action rather than an automatic one, even under the
 * completion-deadline policy below.
 */
exports.adminIssueRefund = async (req, res) => {
  try {
    const { paymentId, reason, notes } = req.body
    if (!paymentId || !reason) {
      return res.status(400).json({ success: false, message: "paymentId and reason are required" })
    }
    if (!["requested_by_customer", "completion_deadline_missed", "admin_discretion"].includes(reason)) {
      return res.status(400).json({ success: false, message: "Invalid reason" })
    }

    const payment = await Payment.findById(paymentId)
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" })
    }

    const order = await Order.findOne({ orderId: payment.orderId })
    if (!order) {
      return res.status(404).json({ success: false, message: "Underlying order not found" })
    }
    if (order.status === "refunded") {
      return res.status(400).json({ success: false, message: "This order was already refunded" })
    }

    const amountInPaise = Math.round(payment.amount * 100)

    let razorpayRefund
    try {
      razorpayRefund = await instance.payments.refund(payment.paymentId, {
        amount: amountInPaise,
        notes: { reason, orderId: payment.orderId },
      })
    } catch (razorpayError) {
      await Refund.create({
        payment: payment._id,
        order: order._id,
        user: payment.consumer,
        courses: payment.courses,
        amount: payment.amount,
        reason,
        notes,
        status: "failed",
        initiatedBy: req.user.id,
      })
      console.error("Razorpay refund failed", razorpayError)
      return res.status(502).json({
        success: false,
        message: "Razorpay rejected the refund. Nothing was reversed — see the audit log for the failed attempt.",
      })
    }

    // Razorpay accepted the refund — from here on, the money IS moving, so
    // enrolment reversal must not be skipped even if a later step throws.
    await unenrollFromCourses(payment.consumer, payment.courses)
    order.status = "refunded"
    await order.save()

    const refundRecord = await Refund.create({
      payment: payment._id,
      order: order._id,
      user: payment.consumer,
      courses: payment.courses,
      amount: payment.amount,
      reason,
      notes,
      razorpayRefundId: razorpayRefund.id,
      status: "processed",
      initiatedBy: req.user.id,
    })

    await recordAudit({
      actor: req.user.id,
      action: "refund.issue",
      targetType: "Payment",
      targetId: payment._id,
      details: { reason, amount: payment.amount, razorpayRefundId: razorpayRefund.id },
    })

    await emitEvent(EVENT_VERBS.REFUND_ISSUED, {
      actor: req.user.id,
      object: { type: "Payment", id: payment._id.toString() },
      context: { userId: payment.consumer.toString(), amount: payment.amount, reason },
    })

    return res.status(200).json({ success: true, data: refundRecord })
  } catch (error) {
    console.error("adminIssueRefund failed", error)
    return res.status(500).json({ success: false, message: "Could not process the refund" })
  }
}

exports.adminListRefunds = async (req, res) => {
  try {
    const refunds = await Refund.find({})
      .populate("user", "firstName lastName email")
      .populate("courses", "courseName")
      .sort({ createdAt: -1 })
      .lean()
    return res.status(200).json({ success: true, data: refunds })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not list refunds" })
  }
}

/**
 * Decision support, not automatic execution: lists enrolments that meet
 * the completion-deadline policy, for an admin to review and act on via
 * adminIssueRefund. See the module doc comment for why this stops short
 * of issuing the refund itself.
 */
exports.adminListRefundEligible = async (req, res) => {
  try {
    const deadline = new Date(Date.now() - REFUND_DEADLINE_DAYS * 24 * 60 * 60 * 1000)

    const staleProgress = await CourseProgress.find({ createdAt: { $lte: deadline } })
      .populate("userId", "firstName lastName email")
      .populate({
        path: "courseID",
        select: "courseName courseContent studentsEnrolled",
        populate: { path: "courseContent", populate: { path: "subSection", select: "_id" } },
      })
      .lean()

    const eligible = staleProgress
      .map((progress) => {
        const totalLectures = (progress.courseID?.courseContent || []).reduce(
          (sum, section) => sum + (section.subSection?.length || 0),
          0
        )
        const completionRatio =
          totalLectures > 0 ? (progress.completedVideos?.length || 0) / totalLectures : 0

        // A student already refunded (or otherwise removed) is no longer in
        // studentsEnrolled — this is what keeps them off the eligible list
        // instead of showing up again on every re-run.
        const stillEnrolled = progress.courseID?.studentsEnrolled?.some(
          (id) => id.toString() === progress.userId?._id?.toString()
        )

        return {
          courseProgressId: progress._id,
          user: progress.userId,
          course: progress.courseID ? { _id: progress.courseID._id, courseName: progress.courseID.courseName } : null,
          enrolledAt: progress.createdAt,
          completionRatio: Math.round(completionRatio * 100) / 100,
          stillEnrolled,
        }
      })
      .filter(
        (entry) =>
          entry.course &&
          entry.stillEnrolled &&
          entry.completionRatio < REFUND_ELIGIBLE_COMPLETION_THRESHOLD
      )

    return res.status(200).json({
      success: true,
      data: eligible,
      policy: { deadlineDays: REFUND_DEADLINE_DAYS, completionThreshold: REFUND_ELIGIBLE_COMPLETION_THRESHOLD },
    })
  } catch (error) {
    console.error("adminListRefundEligible failed", error)
    return res.status(500).json({ success: false, message: "Could not compute refund eligibility" })
  }
}
