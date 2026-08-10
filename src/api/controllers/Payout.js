const InstructorPayoutProfile = require("../models/InstructorPayoutProfile")
const Payout = require("../models/Payout")
const Payment = require("../models/Payment")
const Course = require("../models/Course")
const { recordAudit } = require("../utils/recordAudit")

const maskAccountNumber = (accountNumber) =>
  accountNumber ? `••••${accountNumber.slice(-4)}` : null

const toMaskedProfile = (profile) =>
  profile && {
    ...profile,
    bankAccountNumber: maskAccountNumber(profile.bankAccountNumber),
    // PAN is a tax id, not a secret in the same sense as a bank account,
    // but there's no reason to echo the full value back on every read either.
    panNumber: profile.panNumber ? `${profile.panNumber.slice(0, 2)}••••••${profile.panNumber.slice(-1)}` : null,
  }

// ---------------------------------------------------------------------------
// Instructor-facing
// ---------------------------------------------------------------------------

exports.submitPayoutProfile = async (req, res) => {
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
    return res.status(500).json({ success: false, message: "Could not save payout profile" })
  }
}

exports.getMyPayoutProfile = async (req, res) => {
  try {
    const profile = await InstructorPayoutProfile.findOne({ instructor: req.user.id }).lean()
    return res.status(200).json({ success: true, data: toMaskedProfile(profile) })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load payout profile" })
  }
}

exports.getMyPayouts = async (req, res) => {
  try {
    const payouts = await Payout.find({ instructor: req.user.id })
      .sort({ periodEnd: -1 })
      .lean()
    return res.status(200).json({ success: true, data: payouts })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load payout history" })
  }
}

// ---------------------------------------------------------------------------
// Admin-facing
// ---------------------------------------------------------------------------

exports.adminListPayoutProfiles = async (req, res) => {
  try {
    const { kycStatus } = req.query
    const filter = {}
    if (kycStatus) filter.kycStatus = kycStatus

    const profiles = await InstructorPayoutProfile.find(filter)
      .populate("instructor", "firstName lastName email")
      .lean()

    return res.status(200).json({ success: true, data: profiles.map(toMaskedProfile) })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not list payout profiles" })
  }
}

exports.adminSetKycStatus = async (req, res) => {
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
    return res.status(500).json({ success: false, message: "Could not update KYC status" })
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
async function computeInstructorEarnings(instructorId, periodStart, periodEnd, excludePaymentIds) {
  const payments = await Payment.find({
    date: { $gte: periodStart, $lte: periodEnd },
    _id: { $nin: excludePaymentIds },
  })
    .populate({ path: "courses", select: "price instructor" })
    .lean()

  let gross = 0
  const includedPaymentIds = []

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

exports.adminGeneratePayoutRun = async (req, res) => {
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
    const priorPayouts = await Payout.find({ instructor: instructorId }).select("payments").lean()
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
    return res.status(500).json({ success: false, message: "Could not generate payout run" })
  }
}

exports.adminListPayouts = async (req, res) => {
  try {
    const { instructorId, status } = req.query
    const filter = {}
    if (instructorId) filter.instructor = instructorId
    if (status) filter.status = status

    const payouts = await Payout.find(filter)
      .populate("instructor", "firstName lastName email")
      .sort({ periodEnd: -1 })
      .lean()

    return res.status(200).json({ success: true, data: payouts })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not list payouts" })
  }
}

/**
 * Marks a payout as paid AFTER the admin has actually executed the
 * transfer through whatever channel they used — this endpoint does not
 * move money itself (see the doc comment on the Payout model for why).
 */
exports.adminMarkPayoutPaid = async (req, res) => {
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
    return res.status(500).json({ success: false, message: "Could not update payout" })
  }
}
