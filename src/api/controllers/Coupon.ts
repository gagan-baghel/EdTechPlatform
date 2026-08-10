import type { Request, Response } from "express"
import { fail } from "../lib/respond"
import { isDuplicateKeyError } from "../lib/AppError"
import type { AuthedRequest } from "../lib/http"
import Coupon from "../models/Coupon"
import { recordAudit } from "../utils/recordAudit"

export const createCoupon = async (req: AuthedRequest, res: Response) => {
  try {
    const { code, type, value, courseId, maxUses, expiresAt } = req.body
    if (!code || !type || value === undefined) {
      return res.status(400).json({ success: false, message: "code, type and value are required" })
    }
    if (!["percent", "flat"].includes(type)) {
      return res.status(400).json({ success: false, message: "type must be percent or flat" })
    }
    if (type === "percent" && (value <= 0 || value > 100)) {
      return res.status(400).json({ success: false, message: "Percent value must be between 1 and 100" })
    }

    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      type,
      value,
      course: courseId || null,
      maxUses: maxUses || null,
      expiresAt: expiresAt || null,
      createdBy: req.user.id,
    })

    await recordAudit({
      actor: req.user.id,
      action: "coupon.create",
      targetType: "Coupon",
      targetId: coupon._id,
      details: { code: coupon.code },
    })

    return res.status(201).json({ success: true, data: coupon })
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: "A coupon with that code already exists" })
    }
    return res.status(500).json({ success: false, message: "Could not create coupon" })
  }
}

export const listCoupons = async (req: AuthedRequest, res: Response) => {
  try {
    // Admins see every coupon; instructors see only the ones they created
    // (course-specific promos for their own courses).
    const filter = req.user.accountType === "Admin" ? {} : { createdBy: req.user.id }
    const coupons = await Coupon.find(filter).populate("course", "courseName").sort({ createdAt: -1 }).lean()
    return res.status(200).json({ success: true, data: coupons })
  } catch (error) {
    return fail(res, error, "listCoupons", "Could not load coupons")
  }
}

export const deactivateCoupon = async (req: AuthedRequest, res: Response) => {
  try {
    const { couponId } = req.params
    // Non-admins may only deactivate coupons they created — the ownership
    // check is part of the query, not a separate read.
    const filter: Record<string, unknown> = { _id: couponId }
    if (req.user.accountType !== "Admin") filter.createdBy = req.user.id

    const coupon = await Coupon.findOneAndUpdate(filter, { active: false }, { new: true })
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" })
    }
    return res.status(200).json({ success: true, data: coupon })
  } catch (error) {
    return fail(res, error, "deactivateCoupon", "Could not deactivate coupon")
  }
}

/**
 * Checks a code against a cart and returns the discount it would apply —
 * used by the checkout UI to show the discount BEFORE payment, and by
 * capturePayment to compute the actual order total. Never trust a
 * client-supplied discount amount; this is the one place a discount is
 * computed, on the server, from the coupon and course data alone.
 *
 * @returns {{valid: boolean, message?: string, coupon?, discountAmountRupees?: number}}
 */
export const validateCouponForCart = async (
  code: string,
  courseIds: string[],
  totalAmountRupees: number
) => {
  if (!code) return { valid: false, message: "No coupon code provided" }

  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), active: true })
  if (!coupon) return { valid: false, message: "Invalid coupon code" }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { valid: false, message: "This coupon has expired" }
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, message: "This coupon has reached its usage limit" }
  }
  if (coupon.course && !courseIds.includes(coupon.course.toString())) {
    return { valid: false, message: "This coupon does not apply to the courses in your cart" }
  }

  const rawDiscount = coupon.type === "percent" ? (totalAmountRupees * coupon.value) / 100 : coupon.value
  const discountAmountRupees = Math.min(rawDiscount, totalAmountRupees)

  return { valid: true, coupon, discountAmountRupees: Math.round(discountAmountRupees * 100) / 100 }
}

export const checkCoupon = async (req: Request, res: Response) => {
  try {
    const { code, courseIds, totalAmountRupees } = req.body
    if (!code || !Array.isArray(courseIds) || totalAmountRupees === undefined) {
      return res.status(400).json({ success: false, message: "code, courseIds and totalAmountRupees are required" })
    }
    const result = await exports.validateCouponForCart(code, courseIds, Number(totalAmountRupees))
    return res.status(200).json(result)
  } catch (error) {
    return fail(res, error, "checkCoupon", "Could not check coupon")
  }
}
