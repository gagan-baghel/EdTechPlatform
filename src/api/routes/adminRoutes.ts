import express from "express"
import { asyncHandler, authedHandler } from "../lib/http"
const router = express.Router()

import {
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
} from "../controllers/Admin"
import {
  adminIssueRefund,
  adminListRefunds,
  adminListRefundEligible,
} from "../controllers/Refund"
import { auth, isAdmin } from "../middlewares/auth"
import { rateLimit } from "../middlewares/rateLimit"

// Every route here is auth + isAdmin — this whole router assumes both.
router.use(auth, isAdmin)

// Admin actions are lower-volume than the public auth surface but still
// worth a ceiling, since a compromised admin token or a buggy client
// shouldn't be able to hammer the database unbounded.
const adminLimiter = rateLimit({ name: "admin", max: 120, windowMs: 15 * 60 * 1000 })
router.use(adminLimiter)

router.get("/users", asyncHandler(listUsers, "listUsers"))
router.patch("/users/:userId/active", authedHandler(setUserActive, "setUserActive"))

router.get("/courses", asyncHandler(listCoursesForModeration, "listCoursesForModeration"))
router.patch("/courses/:courseId/takedown", authedHandler(setCourseTakedown, "setCourseTakedown"))

router.get("/payments", asyncHandler(lookupPayments, "lookupPayments"))
router.get("/orders", asyncHandler(lookupOrders, "lookupOrders"))

router.post("/refunds", authedHandler(adminIssueRefund, "adminIssueRefund"))
router.get("/refunds", asyncHandler(adminListRefunds, "adminListRefunds"))
router.get("/refunds/eligible", asyncHandler(adminListRefundEligible, "adminListRefundEligible"))

router.get("/audit-log", asyncHandler(listAuditLog, "listAuditLog"))

router.get("/feature-flags", asyncHandler(listFeatureFlags, "listFeatureFlags"))
router.put("/feature-flags", authedHandler(upsertFeatureFlag, "upsertFeatureFlag"))

router.get("/health", asyncHandler(systemHealth, "systemHealth"))

router.get("/analytics", asyncHandler(analyticsOverview, "analyticsOverview"))
export default router