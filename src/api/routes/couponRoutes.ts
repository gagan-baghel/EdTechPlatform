import { authedHandler } from "../lib/http"
import express from "express"
const router = express.Router()

import {
  createCoupon,
  listCoupons,
  deactivateCoupon,
  checkCoupon,
} from "../controllers/Coupon"
import { auth, isStudent, requireRole } from "../middlewares/auth"

// Was a hand-rolled copy of requireRole living in this one route file.
const isInstructorOrAdmin = requireRole("Instructor", "Admin")


router.post("/", auth, isInstructorOrAdmin, authedHandler(createCoupon, "createCoupon"))
router.get("/", auth, isInstructorOrAdmin, authedHandler(listCoupons, "listCoupons"))
router.patch("/:couponId/deactivate", auth, isInstructorOrAdmin, authedHandler(deactivateCoupon, "deactivateCoupon"))
// Checkout-time validation — student checks a code before paying.
router.post("/check", auth, isStudent, authedHandler(checkCoupon, "checkCoupon"))
export default router