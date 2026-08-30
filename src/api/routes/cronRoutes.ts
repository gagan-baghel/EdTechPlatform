import crypto from "crypto"
import type { NextFunction, Request, Response } from "express"
import express from "express"
const router = express.Router()

import { getEnv } from "../config/env"
import { asyncHandler } from "../lib/http"
import { publishScheduledCourses, transcribePendingLectures } from "../controllers/Cron"

/**
 * Vercel sends `Authorization: Bearer $CRON_SECRET` on cron-triggered
 * requests when CRON_SECRET is set in the project's env vars — this is
 * what stops an outsider from hitting a cron endpoint directly and
 * triggering it early/repeatedly. Fails closed: unset CRON_SECRET means
 * the endpoint refuses every request rather than running unauthenticated.
 */
function verifyCronSecret(req: Request, res: Response, next: NextFunction) {
  // Through getEnv() like every other secret, rather than a second, unvalidated
  // read of process.env that could silently disagree with the schema.
  const secret = getEnv().CRON_SECRET
  if (!secret) {
    console.error("CRON_SECRET is not configured; cron endpoint rejected")
    return res.status(500).json({ success: false })
  }

  const presented = Buffer.from(req.headers.authorization ?? "", "utf8")
  const expected = Buffer.from(`Bearer ${secret}`, "utf8")

  // Constant-time: a plain !== leaks the secret one character at a time
  // through response timing, and this endpoint is publicly reachable.
  const authorized =
    presented.length === expected.length && crypto.timingSafeEqual(presented, expected)

  if (!authorized) {
    return res.status(401).json({ success: false })
  }
  next()
}

router.get(
  "/publish-scheduled",
  verifyCronSecret,
  asyncHandler(publishScheduledCourses, "publishScheduledCourses")
)
router.get(
  "/transcribe-pending",
  verifyCronSecret,
  asyncHandler(transcribePendingLectures, "transcribePendingLectures")
)
export default router