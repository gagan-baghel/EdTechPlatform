const crypto = require("crypto")
const User = require("../models/User")
const Referral = require("../models/Referral")

const COMMISSION_RATE = 0.1 // flat 10% — a real program would tier this; kept simple for v1

exports.getMyReferralCode = async (req, res) => {
  try {
    let user = await User.findById(req.user.id)
    if (!user.referralCode) {
      user.referralCode = crypto.randomBytes(4).toString("hex").toUpperCase()
      await user.save()
    }
    return res.status(200).json({ success: true, data: { referralCode: user.referralCode } })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load referral code" })
  }
}

/**
 * Called once, client-side, right after signup if the visitor arrived via
 * a ?ref=CODE link — deliberately decoupled from the signup form itself
 * (a separate endpoint, not a signup field) so attribution logic never
 * touches the already-hardened signup/OTP flow.
 */
exports.setReferrer = async (req, res) => {
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
    return res.status(500).json({ success: false, message: "Could not set referrer" })
  }
}

exports.listMyReferrals = async (req, res) => {
  try {
    const referrals = await Referral.find({ referrer: req.user.id })
      .populate("referredUser", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean()
    const totalEarnedRupees = referrals.reduce((sum, r) => sum + r.commissionAmountRupees, 0)
    return res.status(200).json({ success: true, data: { referrals, totalEarnedRupees } })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load referrals" })
  }
}

/**
 * Best-effort, called from Payments.js right after a purchase settles —
 * same fire-and-forget pattern as bumpCouponUsage. No-op if the buyer
 * wasn't referred by anyone.
 */
exports.creditReferralCommission = async (buyerId, orderId, amountPaise) => {
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
    if (error?.code !== 11000) {
      console.error("creditReferralCommission failed", orderId, error.message)
    }
  }
}
