import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express"
import cookieParser from "cookie-parser"
import fileUpload from "express-fileupload"

import { razorpayWebhook } from "./controllers/Payments"
import adminRoutes from "./routes/adminRoutes"
import affiliateRoutes from "./routes/affiliateRoutes"
import aiRoutes from "./routes/aiRoutes"
import certificateRoutes from "./routes/certificateRoutes"
import contactUsRoute from "./routes/Contact"
import couponRoutes from "./routes/couponRoutes"
import courseRoutes from "./routes/courseRoutes"
import cronRoutes from "./routes/cronRoutes"
import liveSessionRoutes from "./routes/liveSessionRoutes"
import notificationRoutes from "./routes/notificationRoutes"
import organizationRoutes from "./routes/organizationRoutes"
import paymentRoutes from "./routes/paymentRoutes"
import payoutRoutes from "./routes/payoutRoutes"
import profileRoutes from "./routes/profileRoutes"
import qnaRoutes from "./routes/qnaRoutes"
import quizRoutes from "./routes/quizRoutes"
import recommendationRoutes from "./routes/recommendationRoutes"
import subscriptionRoutes from "./routes/subscriptionRoutes"
import userRoutes from "./routes/userRoutes"
import workspaceRoutes from "./routes/workspaceRoutes"

import { cloudinaryConnect } from "./config/cloudinary"
import { connectDB } from "./config/connectDB"
import { toErrorMessage } from "./lib/AppError"

let infraInitialized = false
let infraInitializationPromise: Promise<void> | null = null

async function initializeInfra(): Promise<void> {
  if (infraInitialized) {
    return
  }

  if (!infraInitializationPromise) {
    infraInitializationPromise = (async () => {
      await connectDB()
      cloudinaryConnect()
      infraInitialized = true
    })().catch((error: unknown) => {
      infraInitializationPromise = null
      throw error
    })
  }

  await infraInitializationPromise
}

export function createApiApp(): Express {
  const app = express()

  // Express advertises itself in a response header by default, which tells a
  // scanner exactly which stack (and CVE list) to try. Nothing needs it.
  app.disable("x-powered-by")

  app.use(cookieParser())

  // One structured JSON line per request. Vercel captures stdout into
  // queryable runtime logs, and x-vercel-id is the request id it already
  // generates — there's no reason to mint a second one.
  app.use((req: Request, res: Response, next: NextFunction) => {
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
    (req: Request, res: Response) => {
      void (async () => {
        try {
          await initializeInfra()
        } catch (error) {
          console.error("Webhook infra init failed", toErrorMessage(error))
          res.status(500).json({ success: false })
          return
        }
        await razorpayWebhook(req, res)
      })()
    }
  )

  // Explicit size cap. Without one, express.json() accepts its 100kb default
  // silently; naming it makes the contract visible and keeps an oversized
  // body from being parsed before anything gets to reject it.
  app.use(express.json({ limit: "1mb" }))
  app.use(express.urlencoded({ extended: true, limit: "1mb" }))
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

  app.use((req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        await initializeInfra()
        next()
      } catch (error) {
        console.error(
          "API infrastructure initialization failed",
          toErrorMessage(error)
        )
        res.status(500).json({
          success: false,
          message: "API infrastructure initialization failed",
        })
      }
    })()
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

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ success: true })
  })

  app.get("/v1/health", (_req: Request, res: Response) => {
    res.status(200).json({ success: true })
  })

  // Most controllers self-catch, so this is a net for what escapes them —
  // without it, an uncaught async rejection falls through to Express's
  // default handler and returns an HTML error page from a JSON API.
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    console.error(
      JSON.stringify({
        event: "unhandled_error",
        requestId: req.headers["x-vercel-id"],
        path: req.path,
        message: toErrorMessage(err),
      })
    )
    if (res.headersSent) return
    res.status(500).json({ success: false, message: "Internal server error" })
  })

  return app
}
