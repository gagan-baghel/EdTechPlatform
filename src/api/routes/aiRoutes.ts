import express from "express"
import { authedHandler } from "../lib/http"
const router = express.Router()

import { askTutor, generateCourseOutline, askAssistant, generateQuizDraft } from "../controllers/AI"
import { auth, isStudent, isInstructor } from "../middlewares/auth"
import { rateLimit } from "../middlewares/rateLimit"

// IP-level ceiling as defense-in-depth; the real cap is the per-user daily
// limit enforced inside the controllers (aiGovernance.js) — this just
// stops a single client from hammering the endpoint in a tight loop.
const aiLimiter = rateLimit({ name: "ai", max: 30, windowMs: 15 * 60 * 1000 })

router.post("/tutor", auth, isStudent, aiLimiter, authedHandler(askTutor, "askTutor"))
router.post("/copilot/outline", auth, isInstructor, aiLimiter, authedHandler(generateCourseOutline, "generateCourseOutline"))
router.post("/copilot/quiz", auth, isInstructor, aiLimiter, authedHandler(generateQuizDraft, "generateQuizDraft"))
// Every role: support questions aren't specific to students or instructors.
router.post("/assistant", auth, aiLimiter, authedHandler(askAssistant, "askAssistant"))
export default router