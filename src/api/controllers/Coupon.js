const Coupon = require("../models/Coupon")
const { recordAudit } = require("../utils/recordAudit")

exports.createCoupon = async (req, res) => {
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
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "A coupon with that code already exists" })
    }
    return res.status(500).json({ success: false, message: "Could not create coupon" })
  }
}

exports.listCoupons = async (req, res) => {
  try {
    // Admins see every coupon; instructors see only the ones they created
    // (course-specific promos for their own courses).
    const filter = req.user.accountType === "Admin" ? {} : { createdBy: req.user.id }
    const coupons = await Coupon.find(filter).populate("course", "courseName").sort({ createdAt: -1 }).lean()
    return res.status(200).json({ success: true, data: coupons })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load coupons" })
  }
}

exports.deactivateCoupon = async (req, res) => {
  try {
    const { couponId } = req.params
    const filter = { _id: couponId }
    if (req.user.accountType !== "Admin") filter.createdBy = req.user.id

    const coupon = await Coupon.findOneAndUpdate(filter, { active: false }, { new: true })
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" })
    }
    return res.status(200).json({ success: true, data: coupon })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not deactivate coupon" })
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
exports.validateCouponForCart = async (code, courseIds, totalAmountRupees) => {
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

exports.checkCoupon = async (req, res) => {
  try {
    const { code, courseIds, totalAmountRupees } = req.body
    if (!code || !Array.isArray(courseIds) || totalAmountRupees === undefined) {
      return res.status(400).json({ success: false, message: "code, courseIds and totalAmountRupees are required" })
    }
    const result = await exports.validateCouponForCart(code, courseIds, Number(totalAmountRupees))
    return res.status(200).json(result)
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not check coupon" })
  }
}
