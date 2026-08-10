import type { NextFunction, Request, Response } from "express"
import express from "express"
const router = express.Router()

import { publishScheduledCourses, transcribePendingLectures } from "../controllers/Cron"

/**
 * Vercel sends `Authorization: Bearer $CRON_SECRET` on cron-triggered
 * requests when CRON_SECRET is set in the project's env vars — this is
 * what stops an outsider from hitting a cron endpoint directly and
 * triggering it early/repeatedly. Fails closed: unset CRON_SECRET means
 * the endpoint refuses every request rather than running unauthenticated.
 */
function verifyCronSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error("CRON_SECRET is not configured; cron endpoint rejected")
    return res.status(500).json({ success: false })
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false })
  }
  next()
}

router.get("/publish-scheduled", verifyCronSecret, publishScheduledCourses)
router.get("/transcribe-pending", verifyCronSecret, transcribePendingLectures)
export default router