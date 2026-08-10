const express = require("express")
const fileUpload = require("express-fileupload")
const cookieParser = require("cookie-parser")

const userRoutes = require("./routes/userRoutes")
const profileRoutes = require("./routes/profileRoutes")
const paymentRoutes = require("./routes/paymentRoutes")
const courseRoutes = require("./routes/courseRoutes")
const contactUsRoute = require("./routes/Contact")
const adminRoutes = require("./routes/adminRoutes")
const payoutRoutes = require("./routes/payoutRoutes")
const quizRoutes = require("./routes/quizRoutes")
const certificateRoutes = require("./routes/certificateRoutes")
const cronRoutes = require("./routes/cronRoutes")
const workspaceRoutes = require("./routes/workspaceRoutes")
const notificationRoutes = require("./routes/notificationRoutes")
const couponRoutes = require("./routes/couponRoutes")
const qnaRoutes = require("./routes/qnaRoutes")
const subscriptionRoutes = require("./routes/subscriptionRoutes")
const recommendationRoutes = require("./routes/recommendationRoutes")
const organizationRoutes = require("./routes/organizationRoutes")
const affiliateRoutes = require("./routes/affiliateRoutes")
const liveSessionRoutes = require("./routes/liveSessionRoutes")
const aiRoutes = require("./routes/aiRoutes")

const { connectDB } = require("./config/connectDB")
const { cloudinaryConnect } = require("./config/cloudinary")

let infraInitialized = false
let infraInitializationPromise = null

async function initializeInfra() {
  if (infraInitialized) {
    return
  }

  if (!infraInitializationPromise) {
    infraInitializationPromise = (async () => {
      await connectDB()
      cloudinaryConnect()
      infraInitialized = true
    })().catch((error) => {
      infraInitializationPromise = null
      throw error
    })
  }

  await infraInitializationPromise
}

function createApiApp() {
  const app = express()

  app.use(cookieParser())

  // One structured JSON line per request. Vercel captures stdout into
  // queryable runtime logs, and x-vercel-id is the request id it already
  // generates — there's no reason to mint a second one.
  app.use((req, res, next) => {
    const start = Date.now()
    res.on("finish", () => {
      console.log(
        JSON.stringify({
          event: "request",
          requestId: req.headers["x-vercel-id"],
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Date.now() - start,
        })
      )
    })
    next()
  })

  // Webhook signature is computed over the exact request bytes, so this must be
  // mounted before express.json() replaces the body with a parsed object.
  app.post(
    "/v1/payment/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        await initializeInfra()
      } catch (error) {
        console.error("Webhook infra init failed", error)
        return res.status(500).json({ success: false })
      }
      return require("./controllers/Payments").razorpayWebhook(req, res)
    }
  )

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(
    fileUpload({
      useTempFiles: true,
      tempFileDir: "/tmp",
      createParentPath: true,
      // Vercel's own 4.5MB request-body cap fires first in production, but
      // this makes the contract explicit locally and is what makes
      // express-fileupload clean up its own partial temp file on an
      // oversized upload instead of leaving it behind.
      limits: { fileSize: 4 * 1024 * 1024 },
      abortOnLimit: true,
    })
  )

  app.use(async (req, res, next) => {
    try {
      await initializeInfra()
      next()
    } catch (error) {
      console.error("API infrastructure initialization failed", error)
      res.status(500).json({
        success: false,
        message: "API infrastructure initialization failed",
      })
    }
  })

  app.use("/v1/auth", userRoutes)
  app.use("/v1/profile", profileRoutes)
  app.use("/v1/course", courseRoutes)
  app.use("/v1/payment", paymentRoutes)
  app.use("/v1/reach", contactUsRoute)
  app.use("/v1/admin", adminRoutes)
  app.use("/v1/payout", payoutRoutes)
  app.use("/v1/quiz", quizRoutes)
  app.use("/v1/certificate", certificateRoutes)
  app.use("/v1/cron", cronRoutes)
  app.use("/v1/workspace", workspaceRoutes)
  app.use("/v1/notifications", notificationRoutes)
  app.use("/v1/coupons", couponRoutes)
  app.use("/v1/qna", qnaRoutes)
  app.use("/v1/subscriptions", subscriptionRoutes)
  app.use("/v1/recommendations", recommendationRoutes)
  app.use("/v1/organizations", organizationRoutes)
  app.use("/v1/affiliate", affiliateRoutes)
  app.use("/v1/live-sessions", liveSessionRoutes)
  app.use("/v1/ai", aiRoutes)

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true })
  })

  app.get("/v1/health", (_req, res) => {
    res.status(200).json({ success: true })
  })

  // Most controllers self-catch, so this is a net for what escapes them —
  // without it, an uncaught async rejection falls through to Express's
  // default handler and returns an HTML error page from a JSON API.
  app.use((err, req, res, _next) => {
    console.error(
      JSON.stringify({
        event: "unhandled_error",
        requestId: req.headers["x-vercel-id"],
        path: req.path,
        message: err?.message,
      })
    )
    if (res.headersSent) return
    res.status(500).json({ success: false, message: "Internal server error" })
  })

  return app
}

module.exports = { createApiApp }
