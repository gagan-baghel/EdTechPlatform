import express from "express"
import { authedHandler } from "../lib/http"
const router = express.Router()

import {
  submitPayoutProfile,
  getMyPayoutProfile,
  getMyPayouts,
  adminListPayoutProfiles,
  adminSetKycStatus,
  adminGeneratePayoutRun,
  adminListPayouts,
  adminMarkPayoutPaid,
} from "../controllers/Payout"
import { auth, isInstructor, isAdmin } from "../middlewares/auth"

// Instructor-facing
router.post("/profile", auth, isInstructor, authedHandler(submitPayoutProfile, "submitPayoutProfile"))
router.get("/profile", auth, isInstructor, authedHandler(getMyPayoutProfile, "getMyPayoutProfile"))
router.get("/my-payouts", auth, isInstructor, authedHandler(getMyPayouts, "getMyPayouts"))

// Admin-facing
router.get("/admin/profiles", auth, isAdmin, adminListPayoutProfiles)
router.patch("/admin/profiles/:profileId/kyc", auth, isAdmin, authedHandler(adminSetKycStatus, "adminSetKycStatus"))
router.post("/admin/generate", auth, isAdmin, authedHandler(adminGeneratePayoutRun, "adminGeneratePayoutRun"))
router.get("/admin/payouts", auth, isAdmin, adminListPayouts)
router.patch("/admin/payouts/:payoutId/mark-paid", auth, isAdmin, authedHandler(adminMarkPayoutPaid, "adminMarkPayoutPaid"))
export default router