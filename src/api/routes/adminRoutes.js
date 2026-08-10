const express = require("express")
const router = express.Router()

const {
  listUsers,
  setUserActive,
  listCoursesForModeration,
  setCourseTakedown,
  lookupPayments,
  lookupOrders,
  listAuditLog,
  listFeatureFlags,
  upsertFeatureFlag,
  systemHealth,
  analyticsOverview,
} = require("../controllers/Admin")

const {
  adminIssueRefund,
  adminListRefunds,
  adminListRefundEligible,
} = require("../controllers/Refund")

const { auth, isAdmin } = require("../middlewares/auth")
const { rateLimit } = require("../middlewares/rateLimit")

// Every route here is auth + isAdmin — this whole router assumes both.
router.use(auth, isAdmin)

// Admin actions are lower-volume than the public auth surface but still
// worth a ceiling, since a compromised admin token or a buggy client
// shouldn't be able to hammer the database unbounded.
const adminLimiter = rateLimit({ name: "admin", max: 120, windowMs: 15 * 60 * 1000 })
router.use(adminLimiter)

router.get("/users", listUsers)
router.patch("/users/:userId/active", setUserActive)

router.get("/courses", listCoursesForModeration)
router.patch("/courses/:courseId/takedown", setCourseTakedown)

router.get("/payments", lookupPayments)
router.get("/orders", lookupOrders)

router.post("/refunds", adminIssueRefund)
router.get("/refunds", adminListRefunds)
router.get("/refunds/eligible", adminListRefundEligible)

router.get("/audit-log", listAuditLog)

router.get("/feature-flags", listFeatureFlags)
router.put("/feature-flags", upsertFeatureFlag)

router.get("/health", systemHealth)

router.get("/analytics", analyticsOverview)

module.exports = router
