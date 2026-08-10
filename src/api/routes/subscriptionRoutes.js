const express = require("express")
const router = express.Router()

const {
  createPlan,
  listPlans,
  createSubscription,
  getMySubscription,
  cancelSubscription,
} = require("../controllers/Subscription")
const { auth, isAdmin, isStudent } = require("../middlewares/auth")

router.post("/plans", auth, isAdmin, createPlan)
router.get("/plans", listPlans)
router.post("/", auth, isStudent, createSubscription)
router.get("/mine", auth, isStudent, getMySubscription)
router.post("/cancel", auth, isStudent, cancelSubscription)

module.exports = router
