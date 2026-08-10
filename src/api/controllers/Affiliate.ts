import type { Types } from "mongoose"
import { fail } from "../lib/respond"
import type { Response } from "express"
import { toErrorMessage, isDuplicateKeyError } from "../lib/AppError"
import type { AuthedRequest } from "../lib/http"
import crypto from "crypto"
import User from "../models/User"
import Referral from "../models/Referral"

const COMMISSION_RATE = 0.1 // flat 10% — a real program would tier this; kept simple for v1

export const getMyReferralCode = async (req: AuthedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user.referralCode) {
      user.referralCode = crypto.randomBytes(4).toString("hex").toUpperCase()
      await user.save()
    }
    return res.status(200).json({ success: true, data: { referralCode: user.referralCode } })
  } catch (error) {
    return fail(res, error, "getMyReferralCode", "Could not load referral code")
  }
}

/**
 * Called once, client-side, right after signup if the visitor arrived via
 * a ?ref=CODE link — deliberately decoupled from the signup form itself
 * (a separate endpoint, not a signup field) so attribution logic never
 * touches the already-hardened signup/OTP flow.
 */
export const setReferrer = async (req: AuthedRequest, res: Response) => {
  try {
    const { referralCode } = req.body
    if (!referralCode) {
      return res.status(400).json({ success: false, message: "referralCode is required" })
    }

    const referrer = await User.findOne({ referralCode: referralCode.trim().toUpperCase() })
    if (!referrer || referrer._id.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: "Invalid referral code" })
    }

    const user = await User.findById(req.user.id)
    if (user.referredBy) {
      return res.status(400).json({ success: false, message: "Referrer already set" })
    }

    user.referredBy = referrer._id
    await user.save()

    return res.status(200).json({ success: true, message: "Referral attributed" })
  } catch (error) {
    return fail(res, error, "setReferrer", "Could not set referrer")
  }
}

export const listMyReferrals = async (req: AuthedRequest, res: Response) => {
  try {
    const referrals = await Referral.find({ referrer: req.user.id })
      .populate("referredUser", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean()
    const totalEarnedRupees = referrals.reduce(
      (sum: number, r: { commissionAmountRupees: number }) =>
        sum + r.commissionAmountRupees,
      0
    )
    return res.status(200).json({ success: true, data: { referrals, totalEarnedRupees } })
  } catch (error) {
    return fail(res, error, "listMyReferrals", "Could not load referrals")
  }
}

/**
 * Best-effort, called from Payments.js right after a purchase settles —
 * same fire-and-forget pattern as bumpCouponUsage. No-op if the buyer
 * wasn't referred by anyone.
 */
export const creditReferralCommission = async (
  buyerId: Types.ObjectId | string,
  orderId: string,
  amountPaise: number
) => {
  try {
    const buyer = await User.findById(buyerId).select("referredBy")
    if (!buyer?.referredBy) return

    const commissionAmountRupees = Math.round(((amountPaise / 100) * COMMISSION_RATE) * 100) / 100
    await Referral.create({
      referrer: buyer.referredBy,
      referredUser: buyerId,
      orderId,
      commissionAmountRupees,
    })
  } catch (error) {
    // Duplicate-key on {referrer, orderId} means this was already credited
    // (a settle retry) — not a real failure.
    if (!isDuplicateKeyError(error)) {
      console.error("creditReferralCommission failed", orderId, toErrorMessage(error))
    }
  }
}
