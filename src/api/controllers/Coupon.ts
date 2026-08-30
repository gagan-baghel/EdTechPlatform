import { z } from "zod"
import type { Response } from "express"

import { fail, parseOrThrow } from "../lib/respond"
import { objectId, rupees } from "../lib/schemas"
import { isDuplicateKeyError } from "../lib/AppError"
import type { AuthedRequest } from "../lib/http"
import Coupon from "../models/Coupon"
import { recordAudit } from "../utils/recordAudit"

const CreateCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "A coupon code must be at least 3 characters")
      .max(40, "A coupon code must be at most 40 characters")
      .regex(/^[A-Z0-9_-]+$/, "A coupon code may only contain letters, digits, - and _"),
    type: z.enum(["percent", "flat"]),
    value: z.coerce.number().positive("Discount value must be greater than zero"),
    courseId: objectId().nullish(),
    maxUses: z.coerce.number().int().positive().nullish(),
    expiresAt: z.coerce.date().nullish(),
  })
  .refine((data) => data.type !== "percent" || data.value <= 100, {
    message: "Percent value must be between 1 and 100",
    path: ["value"],
  })

const CheckCouponSchema = z.object({
  code: z.string().trim().min(1, "A coupon code is required").max(40),
  courseIds: z.array(objectId()).min(1, "courseIds is required"),
  totalAmountRupees: rupees(),
})

export const createCoupon = async (req: AuthedRequest, res: Response) => {
  try {
    // `value` was previously unbounded below zero for flat coupons. A
    // negative flat discount inverts the arithmetic in validateCouponForCart
    // (`total - (-x)`) and CHARGES the customer more than the listed price.
    const { code, type, value, courseId, maxUses, expiresAt } = parseOrThrow(
      CreateCouponSchema,
      req.body
    )

    const coupon = await Coupon.create({
      code,
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
    return fail(res, error, "createCoupon", "Could not create coupon")
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
    const { couponId } = parseOrThrow(
      z.object({ couponId: objectId("A valid coupon id is required") }),
      req.params
    )
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

export const checkCoupon = async (req: AuthedRequest, res: Response) => {
  try {
    const { code, courseIds, totalAmountRupees } = parseOrThrow(CheckCouponSchema, req.body)
    // Was `exports.validateCouponForCart(...)`, a CommonJS leftover from the
    // JS-to-TS migration. `exports` does not exist in an ES module, so this
    // endpoint threw a ReferenceError on every call — the coupon field in
    // checkout has never worked.
    const result = await validateCouponForCart(code, courseIds, totalAmountRupees)
    return res.status(200).json(result)
  } catch (error) {
    return fail(res, error, "checkCoupon", "Could not check coupon")
  }
}
