import type { RequestHandler } from "express"
import { Schema } from "mongoose"

import { defineModel } from "../lib/mongoose"
import { clientIp } from "../lib/http"

// Mongo-backed rather than in-memory: this app runs serverless, where each
// instance has its own heap and an in-memory counter would reset constantly.
interface RateLimitRecord {
  key: string
  hits: number
  expiresAt: Date
}

const rateLimitSchema = new Schema<RateLimitRecord>({
  // Unique, so two concurrent first-requests for the same key collapse onto
  // one bucket instead of racing into two documents that each get their own
  // allowance. The TTL index reclaims space; it is NOT what expires a window
  // — see the comment in the handler.
  key: { type: String, required: true, unique: true },
  hits: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
})

const RateLimit = defineModel("RateLimit", rateLimitSchema)

export interface RateLimitOptions {
  /** Bucket name; keeps limiters independent of one another. */
  name: string
  /** Allowed requests per window. */
  max: number
  /** Window length in milliseconds. */
  windowMs: number
  /**
   * Also scope the bucket by the request's email, so one attacker cannot
   * lock every user out from a single IP.
   */
  byEmail?: boolean
}

export function rateLimit({
  name,
  max,
  windowMs,
  byEmail = false,
}: RateLimitOptions): RequestHandler {
  return (req, res, next) => {
    void (async () => {
      try {
        const parts = [name, clientIp(req)]

        const email = (req.body as { email?: unknown } | undefined)?.email
        if (byEmail && typeof email === "string") {
          parts.push(email.toLowerCase())
        }

        const key = parts.join(":")
        const now = Date.now()

        let record = await RateLimit.findOneAndUpdate(
          { key },
          {
            $inc: { hits: 1 },
            $setOnInsert: { expiresAt: new Date(now + windowMs) },
          },
          { new: true, upsert: true }
        )

        /**
         * Window expiry is enforced HERE, not by the TTL index.
         *
         * This is the bug that made the limiter a permanent lockout: window
         * reset was left entirely to Mongo's TTL monitor, which (a) only
         * sweeps roughly once a minute and (b) had never been created at all,
         * because `autoIndex` is off and ensure-indexes.ts didn't build it.
         * With no sweep, `hits` incremented forever and every account that hit
         * ten failed logins was locked out of the platform permanently.
         *
         * Reset is conditional on the observed `expiresAt` so two requests
         * racing past the boundary cannot both reset and hand out 2× the
         * allowance — the loser's update matches nothing and it re-reads.
         */
        if (record.expiresAt.getTime() <= now) {
          const reset = await RateLimit.findOneAndUpdate(
            { _id: record._id, expiresAt: record.expiresAt },
            { $set: { hits: 1, expiresAt: new Date(now + windowMs) } },
            { new: true }
          )
          record = reset ?? (await RateLimit.findById(record._id)) ?? record
        }

        if (record.hits > max) {
          const retryAfter = Math.max(
            1,
            Math.ceil((record.expiresAt.getTime() - now) / 1000)
          )
          res.set("Retry-After", String(retryAfter))
          res.status(429).json({
            success: false,
            code: "RATE_LIMITED",
            message: `Too many attempts. Please try again in ${retryAfter} seconds.`,
          })
          return
        }

        next()
      } catch (error) {
        // A limiter outage must not take authentication down with it.
        console.error("Rate limiter unavailable, allowing request", error)
        next()
      }
    })()
  }
}
