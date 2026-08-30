import express from "express"
import { asyncHandler, authedHandler } from "../lib/http"
const router = express.Router()

import {
  createPlan,
  listPlans,
  createSubscription,
  getMySubscription,
  cancelSubscription,
} from "../controllers/Subscription"
import { auth, isAdmin, isStudent } from "../middlewares/auth"

router.post("/plans", auth, isAdmin, authedHandler(createPlan, "createPlan"))
router.get("/plans", asyncHandler(listPlans, "listPlans"))
router.post("/", auth, isStudent, authedHandler(createSubscription, "createSubscription"))
router.get("/mine", auth, isStudent, authedHandler(getMySubscription, "getMySubscription"))
router.post("/cancel", auth, isStudent, authedHandler(cancelSubscription, "cancelSubscription"))
export default router