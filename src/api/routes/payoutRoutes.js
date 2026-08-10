const express = require("express")
const router = express.Router()

const {
  submitPayoutProfile,
  getMyPayoutProfile,
  getMyPayouts,
  adminListPayoutProfiles,
  adminSetKycStatus,
  adminGeneratePayoutRun,
  adminListPayouts,
  adminMarkPayoutPaid,
} = require("../controllers/Payout")

const { auth, isInstructor, isAdmin } = require("../middlewares/auth")

// Instructor-facing
router.post("/profile", auth, isInstructor, submitPayoutProfile)
router.get("/profile", auth, isInstructor, getMyPayoutProfile)
router.get("/my-payouts", auth, isInstructor, getMyPayouts)

// Admin-facing
router.get("/admin/profiles", auth, isAdmin, adminListPayoutProfiles)
router.patch("/admin/profiles/:profileId/kyc", auth, isAdmin, adminSetKycStatus)
router.post("/admin/generate", auth, isAdmin, adminGeneratePayoutRun)
router.get("/admin/payouts", auth, isAdmin, adminListPayouts)
router.patch("/admin/payouts/:payoutId/mark-paid", auth, isAdmin, adminMarkPayoutPaid)

module.exports = router
