import { z } from "zod"
import { fail, parseOrThrow } from "../lib/respond"
import { objectId, paginationQuery, text, toSkip } from "../lib/schemas"
import { decrypt } from "../lib/crypto"
import type { Types } from "mongoose"
import type { Request, Response } from "express"
import type { AuthedRequest } from "../lib/http"
import InstructorPayoutProfile from "../models/InstructorPayoutProfile"
import Payout from "../models/Payout"
import Payment from "../models/Payment"
import { recordAudit } from "../utils/recordAudit"

const KYC_STATUSES = ["not_submitted", "pending", "verified", "rejected"] as const
const PAYOUT_STATUSES = ["pending", "paid", "failed"] as const

/**
 * Indian bank identifiers have fixed, checkable shapes. Validating them here
 * is not cosmetic: an unvalidated account number is money sent to nowhere,
 * and the failure surfaces days later as a bounced transfer rather than as a
 * form error the instructor can fix.
 */
const PayoutProfileSchema = z.object({
  bankAccountHolderName: text({ max: 120, label: "Account holder name" }),
  bankAccountNumber: z
    .string()
    .trim()
    .regex(/^\d{9,18}$/, "Bank account number must be 9-18 digits"),
  ifscCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "IFSC code is not valid"),
  panNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "PAN number is not valid"),
})

/** A Payment with its `courses` refs resolved to the two fields selected. */
interface PaymentWithCourses {
  _id: Types.ObjectId
  amount: number
  courses: { price?: number; instructor?: Types.ObjectId }[]
}

const maskAccountNumber = (accountNumber: string): string | null =>
  accountNumber ? `••••${accountNumber.slice(-4)}` : null

/**
 * `.lean()` returns raw documents, so the schema getter that decrypts
 * bankAccountNumber never runs — masking the stored value directly would show
 * the last four characters of AES ciphertext and look entirely plausible.
 * Decryption is done explicitly here instead.
 */
const revealAccountNumber = (stored: string): string => {
  if (!stored) return ""
  try {
    return decrypt(stored)
  } catch (error) {
    // A rotated or missing key must not turn into a masked value that looks
    // real. Better to show nothing and log it.
    console.error("Could not decrypt a payout account number", error)
    return ""
  }
}

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
    bankAccountNumber: maskAccountNumber(revealAccountNumber(bankAccountNumber)),
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
    const { bankAccountHolderName, bankAccountNumber, ifscCode, panNumber } =
      parseOrThrow(PayoutProfileSchema, req.body)

    const profile = await InstructorPayoutProfile.findOneAndUpdate(
      { instructor: req.user.id },
      {
        $set: {
          bankAccountHolderName,
          bankAccountNumber,
          ifscCode,
          panNumber,
          // Any change to bank/KYC details resets verification — the whole
          // point of KYC is that it verifies THESE details, not the account.
          kycStatus: "pending",
        },
        // `kycRejectionReason: undefined` was a no-op: Mongoose strips
        // undefined from an update, so a resubmission kept displaying the
        // reason the PREVIOUS details were rejected for.
        $unset: { kycRejectionReason: 1 },
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
    const { kycStatus, page, limit } = parseOrThrow(
      paginationQuery().extend({ kycStatus: z.enum(KYC_STATUSES).optional() }),
      req.query
    )
    const { skip } = toSkip({ page, limit })

    const filter: Record<string, unknown> = {}
    if (kycStatus) filter.kycStatus = kycStatus

    const [profiles, total] = await Promise.all([
      InstructorPayoutProfile.find(filter)
        .populate("instructor", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InstructorPayoutProfile.countDocuments(filter),
    ])

    return res
      .status(200)
      .json({ success: true, data: profiles.map(toMaskedProfile), page, limit, total })
  } catch (error) {
    return fail(res, error, "adminListPayoutProfiles", "Could not list payout profiles")
  }
}

export const adminSetKycStatus = async (req: AuthedRequest, res: Response) => {
  try {
    const { profileId } = parseOrThrow(
      z.object({ profileId: objectId("A valid payout profile id is required") }),
      req.params
    )
    const { kycStatus, rejectionReason } = parseOrThrow(
      z.object({
        kycStatus: z.enum(["verified", "rejected", "pending"]),
        rejectionReason: text({ max: 500, label: "Rejection reason" }).optional(),
      }),
      req.body
    )

    if (kycStatus === "rejected" && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "A rejection reason is required so the instructor knows what to fix.",
      })
    }

    const profile = await InstructorPayoutProfile.findByIdAndUpdate(
      profileId,
      kycStatus === "rejected"
        ? { $set: { kycStatus, kycRejectionReason: rejectionReason } }
        : // Same `undefined` trap as submitPayoutProfile — an approval must
          // actually remove the stale rejection reason, not leave it behind.
          { $set: { kycStatus }, $unset: { kycRejectionReason: 1 } },
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
    const { instructorId, periodStart, periodEnd } = parseOrThrow(
      z
        .object({
          instructorId: objectId("A valid instructor id is required"),
          periodStart: z.coerce.date(),
          periodEnd: z.coerce.date(),
        })
        .refine((data) => data.periodStart <= data.periodEnd, {
          message: "periodStart must not be after periodEnd",
          path: ["periodEnd"],
        }),
      req.body
    )

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
      periodStart,
      periodEnd,
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
    const { instructorId, status, page, limit } = parseOrThrow(
      paginationQuery().extend({
        instructorId: objectId().optional(),
        status: z.enum(PAYOUT_STATUSES).optional(),
      }),
      req.query
    )
    const { skip } = toSkip({ page, limit })

    const filter: Record<string, unknown> = {}
    if (instructorId) filter.instructor = instructorId
    if (status) filter.status = status

    const [payouts, total] = await Promise.all([
      Payout.find(filter)
        .populate("instructor", "firstName lastName email")
        .sort({ periodEnd: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payout.countDocuments(filter),
    ])

    return res.status(200).json({ success: true, data: payouts, page, limit, total })
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
    const { payoutId } = parseOrThrow(
      z.object({ payoutId: objectId("A valid payout id is required") }),
      req.params
    )
    const { transactionReference } = parseOrThrow(
      z.object({
        transactionReference: text({ max: 200, label: "Transaction reference" }),
      }),
      req.body
    )

    // Conditional on the payout still being pending. A blind update let two
    // admins (or a double-clicked button) each record a different transfer
    // reference against the same payout, overwriting the first — which is
    // exactly the record you need when reconciling a duplicate transfer.
    const payout = await Payout.findOneAndUpdate(
      { _id: payoutId, status: "pending" },
      { $set: { status: "paid", paidAt: new Date(), transactionReference } },
      { new: true }
    )
    if (!payout) {
      const exists = await Payout.exists({ _id: payoutId })
      return res.status(exists ? 409 : 404).json({
        success: false,
        message: exists
          ? "That payout is no longer pending — it has already been marked paid."
          : "Payout not found",
      })
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
