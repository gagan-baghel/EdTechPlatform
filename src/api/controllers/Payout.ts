import { queryString } from "../lib/request"
import { fail } from "../lib/respond"
import type { Types } from "mongoose"
import type { Request, Response } from "express"
import type { AuthedRequest } from "../lib/http"
import InstructorPayoutProfile from "../models/InstructorPayoutProfile"
import Payout from "../models/Payout"
import Payment from "../models/Payment"
import { recordAudit } from "../utils/recordAudit"

/** A Payment with its `courses` refs resolved to the two fields selected. */
interface PaymentWithCourses {
  _id: Types.ObjectId
  amount: number
  courses: { price?: number; instructor?: Types.ObjectId }[]
}

const maskAccountNumber = (accountNumber: string): string | null =>
  accountNumber ? `••••${accountNumber.slice(-4)}` : null

/**
 * Takes `unknown` because `.lean()` types its result as `FlattenMaps<any>` and
 * the callers pass it straight through. Narrowing here means the masking
 * cannot be silently skipped by a read whose shape drifts — a missed mask on
 * this particular field would leak a full bank account number.
 */
const toMaskedProfile = (profile: unknown) => {
  if (!profile || typeof profile !== "object") return null
  const raw = profile as Record<string, unknown>
  const bankAccountNumber =
    typeof raw.bankAccountNumber === "string" ? raw.bankAccountNumber : ""
  const panNumber = typeof raw.panNumber === "string" ? raw.panNumber : ""

  return {
    ...raw,
    bankAccountNumber: maskAccountNumber(bankAccountNumber),
    // PAN is a tax id, not a secret in the same sense as a bank account,
    // but there's no reason to echo the full value back on every read either.
    panNumber: panNumber ? `${panNumber.slice(0, 2)}••••••${panNumber.slice(-1)}` : null,
  }
}

// ---------------------------------------------------------------------------
// Instructor-facing
// ---------------------------------------------------------------------------

export const submitPayoutProfile = async (req: AuthedRequest, res: Response) => {
  try {
    const { bankAccountHolderName, bankAccountNumber, ifscCode, panNumber } = req.body
    if (!bankAccountHolderName || !bankAccountNumber || !ifscCode || !panNumber) {
      return res.status(400).json({ success: false, message: "All fields are required" })
    }

    const profile = await InstructorPayoutProfile.findOneAndUpdate(
      { instructor: req.user.id },
      {
        bankAccountHolderName,
        bankAccountNumber,
        ifscCode,
        panNumber,
        // Any change to bank/KYC details resets verification — the whole
        // point of KYC is that it verifies THESE details, not the account.
        kycStatus: "pending",
        kycRejectionReason: undefined,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean()

    return res.status(200).json({ success: true, data: toMaskedProfile(profile) })
  } catch (error) {
    return fail(res, error, "submitPayoutProfile", "Could not save payout profile")
  }
}

export const getMyPayoutProfile = async (req: AuthedRequest, res: Response) => {
  try {
    const profile = await InstructorPayoutProfile.findOne({ instructor: req.user.id }).lean()
    return res.status(200).json({ success: true, data: toMaskedProfile(profile) })
  } catch (error) {
    return fail(res, error, "getMyPayoutProfile", "Could not load payout profile")
  }
}

export const getMyPayouts = async (req: AuthedRequest, res: Response) => {
  try {
    const payouts = await Payout.find({ instructor: req.user.id })
      .sort({ periodEnd: -1 })
      .lean()
    return res.status(200).json({ success: true, data: payouts })
  } catch (error) {
    return fail(res, error, "getMyPayouts", "Could not load payout history")
  }
}

// ---------------------------------------------------------------------------
// Admin-facing
// ---------------------------------------------------------------------------

export const adminListPayoutProfiles = async (req: Request, res: Response) => {
  try {
    const kycStatus = queryString(req, "kycStatus")
    const filter: Record<string, unknown> = {}
    if (kycStatus) filter.kycStatus = kycStatus

    const profiles = await InstructorPayoutProfile.find(filter)
      .populate("instructor", "firstName lastName email")
      .lean()

    return res.status(200).json({ success: true, data: profiles.map(toMaskedProfile) })
  } catch (error) {
    return fail(res, error, "adminListPayoutProfiles", "Could not list payout profiles")
  }
}

export const adminSetKycStatus = async (req: AuthedRequest, res: Response) => {
  try {
    const { profileId } = req.params
    const { kycStatus, rejectionReason } = req.body
    if (!["verified", "rejected", "pending"].includes(kycStatus)) {
      return res.status(400).json({ success: false, message: "Invalid kycStatus" })
    }

    const profile = await InstructorPayoutProfile.findByIdAndUpdate(
      profileId,
      { kycStatus, kycRejectionReason: kycStatus === "rejected" ? rejectionReason : undefined },
      { new: true }
    )
    if (!profile) {
      return res.status(404).json({ success: false, message: "Payout profile not found" })
    }

    await recordAudit({
      actor: req.user.id,
      action: `payout_profile.kyc_${kycStatus}`,
      targetType: "InstructorPayoutProfile",
      targetId: profileId,
      details: { instructor: profile.instructor, rejectionReason },
    })

    return res.status(200).json({ success: true, message: "KYC status updated" })
  } catch (error) {
    return fail(res, error, "adminSetKycStatus", "Could not update KYC status")
  }
}

/**
 * Computes what an instructor is owed for payments in [periodStart,
 * periodEnd] that aren't already covered by a prior payout, from actual
 * Payment records.
 *
 * Approximation, stated plainly: Payment.amount is the total for an order
 * that may span multiple courses (possibly from different instructors),
 * and Payment does not store a per-course price breakdown at time of
 * purchase — only Order.amount / Payment.amount as a whole. This splits
 * each payment's amount across its courses proportionally by CURRENT
 * course price, not the price at purchase time. For the common case (one
 * course per order) this is exact; for multi-course orders where a
 * course's price changed since purchase, it's an approximation. Storing a
 * real per-course price snapshot on Order at purchase time would remove
 * this approximation entirely — a content-model change out of scope here,
 * flagged rather than silently accepted.
 */
async function computeInstructorEarnings(
  instructorId: Types.ObjectId | string,
  periodStart: Date,
  periodEnd: Date,
  excludePaymentIds: (Types.ObjectId | string)[]
) {
  // `.populate()` replaces the ObjectId refs in `courses` with documents, but
  // Mongoose's chained typings still report the schema type (ObjectId[]).
  // One cast at the query is honest about that; casting per property access
  // would not be. Only the two fields selected above are declared.
  const payments = (await Payment.find({
    date: { $gte: periodStart, $lte: periodEnd },
    _id: { $nin: excludePaymentIds },
  })
    .populate({ path: "courses", select: "price instructor" })
    .lean()) as unknown as PaymentWithCourses[]

  let gross = 0
  const includedPaymentIds: Types.ObjectId[] = []

  for (const payment of payments) {
    const coursesInPayment = payment.courses || []
    const relevantCourses = coursesInPayment.filter(
      (course) => course?.instructor?.toString() === instructorId.toString()
    )
    if (relevantCourses.length === 0) continue

    const totalOfAllCoursesInPayment = coursesInPayment.reduce(
      (sum, course) => sum + (course?.price || 0),
      0
    )
    const relevantTotal = relevantCourses.reduce((sum, course) => sum + (course?.price || 0), 0)

    const share =
      totalOfAllCoursesInPayment > 0
        ? (relevantTotal / totalOfAllCoursesInPayment) * payment.amount
        : 0

    gross += share
    includedPaymentIds.push(payment._id)
  }

  return { gross, includedPaymentIds }
}

export const adminGeneratePayoutRun = async (req: AuthedRequest, res: Response) => {
  try {
    const { instructorId, periodStart, periodEnd } = req.body
    if (!instructorId || !periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        message: "instructorId, periodStart and periodEnd are required",
      })
    }

    const profile = await InstructorPayoutProfile.findOne({ instructor: instructorId })
    if (!profile || profile.kycStatus !== "verified") {
      return res.status(400).json({
        success: false,
        message: "Instructor's payout profile is not KYC-verified",
      })
    }

    // Never double-count a payment that already belongs to a prior run for
    // this instructor, regardless of period boundaries.
    const priorPayouts = (await Payout.find({ instructor: instructorId })
      .select("payments")
      .lean()) as unknown as { payments: Types.ObjectId[] }[]
    const alreadyPaidPaymentIds = priorPayouts.flatMap((payout) => payout.payments)

    const { gross, includedPaymentIds } = await computeInstructorEarnings(
      instructorId,
      new Date(periodStart),
      new Date(periodEnd),
      alreadyPaidPaymentIds
    )

    if (includedPaymentIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No new earnings for this instructor in this period",
        data: null,
      })
    }

    const platformFeePercent = profile.platformFeePercent ?? 30
    const platformFeeAmount = Math.round(gross * (platformFeePercent / 100) * 100) / 100
    const netAmount = Math.round((gross - platformFeeAmount) * 100) / 100

    const payout = await Payout.create({
      instructor: instructorId,
      periodStart,
      periodEnd,
      payments: includedPaymentIds,
      grossAmount: gross,
      platformFeeAmount,
      netAmount,
      status: "pending",
    })

    await recordAudit({
      actor: req.user.id,
      action: "payout.generate",
      targetType: "Payout",
      targetId: payout._id,
      details: { instructorId, grossAmount: gross, netAmount, paymentCount: includedPaymentIds.length },
    })

    return res.status(201).json({ success: true, data: payout })
  } catch (error) {
    return fail(res, error, "adminGeneratePayoutRun", "Could not generate payout run")
  }
}

export const adminListPayouts = async (req: Request, res: Response) => {
  try {
    const instructorId = queryString(req, "instructorId")

    const status = queryString(req, "status")
    const filter: Record<string, unknown> = {}
    if (instructorId) filter.instructor = instructorId
    if (status) filter.status = status

    const payouts = await Payout.find(filter)
      .populate("instructor", "firstName lastName email")
      .sort({ periodEnd: -1 })
      .lean()

    return res.status(200).json({ success: true, data: payouts })
  } catch (error) {
    return fail(res, error, "adminListPayouts", "Could not list payouts")
  }
}

/**
 * Marks a payout as paid AFTER the admin has actually executed the
 * transfer through whatever channel they used — this endpoint does not
 * move money itself (see the doc comment on the Payout model for why).
 */
export const adminMarkPayoutPaid = async (req: AuthedRequest, res: Response) => {
  try {
    const { payoutId } = req.params
    const { transactionReference } = req.body
    if (!transactionReference) {
      return res.status(400).json({
        success: false,
        message: "transactionReference is required as proof the transfer happened",
      })
    }

    const payout = await Payout.findByIdAndUpdate(
      payoutId,
      { status: "paid", paidAt: new Date(), transactionReference },
      { new: true }
    )
    if (!payout) {
      return res.status(404).json({ success: false, message: "Payout not found" })
    }

    await recordAudit({
      actor: req.user.id,
      action: "payout.mark_paid",
      targetType: "Payout",
      targetId: payoutId,
      details: { transactionReference, netAmount: payout.netAmount },
    })

    return res.status(200).json({ success: true, message: "Payout marked as paid" })
  } catch (error) {
    return fail(res, error, "adminMarkPayoutPaid", "Could not update payout")
  }
}
