import { fail, parseOrThrow } from "../lib/respond"
import { objectId, paginationQuery, text, toSkip } from "../lib/schemas"

/** A CourseProgress row with its course populated, as read for eligibility. */
interface StaleProgress {
  _id: unknown
  createdAt: Date
  completedVideos?: unknown[]
  userId?: { _id?: unknown }
  courseID?: {
    _id: unknown
    courseName: string
    courseContent?: { subSection?: unknown[] }[]
    studentsEnrolled?: unknown[]
  }
}
import { z } from "zod"
import type { Types } from "mongoose"
import type { Request, Response } from "express"
import type { AuthedRequest } from "../lib/http"
import { getRazorpay } from "../config/razorpay"
import Payment from "../models/Payment"
import Order from "../models/Order"
import Course from "../models/Course"
import User from "../models/User"
import CourseProgress from "../models/CourseProgress"
import Refund from "../models/Refund"
import { recordAudit } from "../utils/recordAudit"
import { emitEvent, EVENT_VERBS } from "../utils/emitEvent"

// Outcome-accountability refund policy (plan §1): a student who hasn't
// made meaningful progress within this window is owed a refund, not just
// permitted to ask for one. Both numbers are deliberately simple constants
// rather than admin-configurable settings — turning this into a real
// per-course/per-instructor policy is a product decision for later, not
// something to invent unilaterally as a side effect of building the
// refund pipeline.
const REFUND_DEADLINE_DAYS = 30
const REFUND_ELIGIBLE_COMPLETION_THRESHOLD = 0.5 // below 50% complete

const REFUND_REASONS = [
  "requested_by_customer",
  "completion_deadline_missed",
  "admin_discretion",
] as const

const IssueRefundSchema = z.object({
  paymentId: objectId("A valid payment id is required"),
  reason: z.enum(REFUND_REASONS),
  notes: text({ max: 1000, label: "Notes" }).optional(),
})

/**
 * Reverses the enrolment side of a purchase — the counterpart to
 * enrollStudents in Payments.js. Progress is intentionally left in place
 * rather than deleted: if the refund is disputed or reversed, the record
 * of what they'd actually done shouldn't vanish along with their access.
 */
async function unenrollFromCourses(
  userId: Types.ObjectId | string,
  courseIds: (Types.ObjectId | string)[]
) {
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
export const adminIssueRefund = async (req: AuthedRequest, res: Response) => {
  try {
    const { paymentId, reason, notes } = parseOrThrow(IssueRefundSchema, req.body)

    const payment = await Payment.findById(paymentId)
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" })
    }

    /**
     * Claim the order BEFORE calling Razorpay.
     *
     * The previous order was: read the order, check `status !== "refunded"`,
     * call Razorpay, then write the status. Two admins clicking Refund at the
     * same time — or one impatient double-click — both passed the check and
     * both issued a real refund against the same payment. The platform paid
     * out twice and only one Refund row recorded it.
     *
     * Flipping the status first makes the claim the thing that races, and a
     * loser gets a clean 409 with no money moved. If Razorpay then rejects,
     * the claim is released below so the refund can legitimately be retried.
     */
    const order = await Order.findOneAndUpdate(
      { orderId: payment.orderId, status: { $ne: "refunded" } },
      { $set: { status: "refunded" } },
      { new: true }
    )
    if (!order) {
      const exists = await Order.exists({ orderId: payment.orderId })
      return res.status(exists ? 409 : 404).json({
        success: false,
        message: exists
          ? "This order has already been refunded."
          : "Underlying order not found",
      })
    }

    const amountInPaise = Math.round(payment.amount * 100)

    let razorpayRefund
    try {
      razorpayRefund = await getRazorpay().payments.refund(payment.paymentId, {
        amount: amountInPaise,
        notes: { reason, orderId: payment.orderId },
      })
    } catch (razorpayError) {
      // Nothing moved, so release the claim rather than leaving the order
      // marked refunded with the student still enrolled and no money returned.
      await Order.updateOne({ _id: order._id }, { $set: { status: "paid" } })

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
    return fail(res, error, "adminIssueRefund", "Could not process the refund")
  }
}

export const adminListRefunds = async (req: Request, res: Response) => {
  try {
    const { page, limit } = parseOrThrow(paginationQuery(), req.query)
    const { skip } = toSkip({ page, limit })

    const [refunds, total] = await Promise.all([
      Refund.find({})
        .populate("user", "firstName lastName email")
        .populate("courses", "courseName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Refund.countDocuments({}),
    ])
    return res.status(200).json({ success: true, data: refunds, page, limit, total })
  } catch (error) {
    return fail(res, error, "adminListRefunds", "Could not list refunds")
  }
}

/**
 * Decision support, not automatic execution: lists enrolments that meet
 * the completion-deadline policy, for an admin to review and act on via
 * adminIssueRefund. See the module doc comment for why this stops short
 * of issuing the refund itself.
 */
export const adminListRefundEligible = async (req: Request, res: Response) => {
  try {
    const deadline = new Date(Date.now() - REFUND_DEADLINE_DAYS * 24 * 60 * 60 * 1000)

    const { page, limit } = parseOrThrow(paginationQuery({ defaultLimit: 50 }), req.query)
    const { skip } = toSkip({ page, limit })

    // Bounded. This previously loaded EVERY CourseProgress older than the
    // deadline, each with a two-level populate down to subsections, and built
    // the whole list in memory — an admin page that gets slower every day and
    // eventually cannot render at all.
    const staleProgress = await CourseProgress.find({ createdAt: { $lte: deadline } })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "firstName lastName email")
      .populate({
        path: "courseID",
        select: "courseName courseContent studentsEnrolled",
        populate: { path: "courseContent", populate: { path: "subSection", select: "_id" } },
      })
      .lean()

    const eligible = staleProgress
      .map((progress: StaleProgress) => {
        const totalLectures = (progress.courseID?.courseContent || []).reduce(
          (sum: number, section: { subSection?: unknown[] }) =>
            sum + (section.subSection?.length || 0),
          0
        )
        const completionRatio =
          totalLectures > 0 ? (progress.completedVideos?.length || 0) / totalLectures : 0

        // A student already refunded (or otherwise removed) is no longer in
        // studentsEnrolled — this is what keeps them off the eligible list
        // instead of showing up again on every re-run.
        const stillEnrolled = progress.courseID?.studentsEnrolled?.some(
          (id: unknown) => String(id) === String(progress.userId?._id)
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
        (entry: { course: unknown; stillEnrolled?: boolean; completionRatio: number }) =>
          entry.course &&
          entry.stillEnrolled &&
          entry.completionRatio < REFUND_ELIGIBLE_COMPLETION_THRESHOLD
      )

    return res.status(200).json({
      success: true,
      data: eligible,
      page,
      limit,
      policy: { deadlineDays: REFUND_DEADLINE_DAYS, completionThreshold: REFUND_ELIGIBLE_COMPLETION_THRESHOLD },
    })
  } catch (error) {
    return fail(res, error, "adminListRefundEligible", "Could not compute refund eligibility")
  }
}
