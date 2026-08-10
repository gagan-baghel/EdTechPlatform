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
  key: { type: String, required: true, index: true },
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

        const record = await RateLimit.findOneAndUpdate(
          { key },
          {
            $inc: { hits: 1 },
            $setOnInsert: { expiresAt: new Date(now + windowMs) },
          },
          { new: true, upsert: true }
        )

        if (record && record.hits > max) {
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
