const express = require("express")
const router = express.Router()

const {
  createCoupon,
  listCoupons,
  deactivateCoupon,
  checkCoupon,
} = require("../controllers/Coupon")
const { auth, isStudent } = require("../middlewares/auth")

function isInstructorOrAdmin(req, res, next) {
  if (req.user.accountType === "Instructor" || req.user.accountType === "Admin") return next()
  return res.status(403).json({ success: false, message: "Instructor or Admin access required" })
}

router.post("/", auth, isInstructorOrAdmin, createCoupon)
router.get("/", auth, isInstructorOrAdmin, listCoupons)
router.patch("/:couponId/deactivate", auth, isInstructorOrAdmin, deactivateCoupon)
// Checkout-time validation — student checks a code before paying.
router.post("/check", auth, isStudent, checkCoupon)

module.exports = router
