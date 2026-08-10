const express = require("express")
const router = express.Router()

const { askTutor, generateCourseOutline } = require("../controllers/AI")
const { auth, isStudent, isInstructor } = require("../middlewares/auth")
const { rateLimit } = require("../middlewares/rateLimit")

// IP-level ceiling as defense-in-depth; the real cap is the per-user daily
// limit enforced inside the controllers (aiGovernance.js) — this just
// stops a single client from hammering the endpoint in a tight loop.
const aiLimiter = rateLimit({ name: "ai", max: 30, windowMs: 15 * 60 * 1000 })

router.post("/tutor", auth, isStudent, aiLimiter, askTutor)
router.post("/copilot/outline", auth, isInstructor, aiLimiter, generateCourseOutline)

module.exports = router
