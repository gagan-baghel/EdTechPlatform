const mongoose = require("mongoose")

// Mongo-backed rather than in-memory: this app runs serverless, where each
// instance has its own heap and an in-memory counter would reset constantly.
const rateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, index: true },
  hits: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
})

const RateLimit =
  mongoose.models.RateLimit || mongoose.model("RateLimit", rateLimitSchema)

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"]
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim()
  }
  return req.socket?.remoteAddress || "unknown"
}

/**
 * @param {object}  options
 * @param {string}  options.name     bucket name, keeps limiters independent
 * @param {number}  options.max      allowed requests per window
 * @param {number}  options.windowMs window length
 * @param {boolean} options.byEmail  also scope by request email, so one attacker
 *                                   cannot lock every user out from one IP
 */
function rateLimit({ name, max, windowMs, byEmail = false }) {
  return async function rateLimitMiddleware(req, res, next) {
    try {
      const parts = [name, clientIp(req)]

      if (byEmail && req.body?.email) {
        parts.push(String(req.body.email).toLowerCase())
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

      if (record.hits > max) {
        const retryAfter = Math.max(
          1,
          Math.ceil((record.expiresAt.getTime() - now) / 1000)
        )
        res.set("Retry-After", String(retryAfter))
        return res.status(429).json({
          success: false,
          message: `Too many attempts. Please try again in ${retryAfter} seconds.`,
        })
      }

      next()
    } catch (error) {
      // A limiter outage must not take authentication down with it.
      console.error("Rate limiter unavailable, allowing request", error)
      next()
    }
  }
}

module.exports = { rateLimit }
