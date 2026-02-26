const express = require("express")
const fileUpload = require("express-fileupload")
const cors = require("cors")
const cookieParser = require("cookie-parser")

const userRoutes = require("./routes/userRoutes")
const profileRoutes = require("./routes/profileRoutes")
const paymentRoutes = require("./routes/paymentRoutes")
const courseRoutes = require("./routes/courseRoutes")
const contactUsRoute = require("./routes/Contact")

const { connectDB } = require("./config/connectDB")
const { cloudinaryConnect } = require("./config/cloudinary")

let infraInitialized = false

function initializeInfra() {
  if (infraInitialized) {
    return
  }

  connectDB()
  cloudinaryConnect()
  infraInitialized = true
}

function createApiApp() {
  const app = express()

  app.use(cookieParser())
  app.use(express.json())
  app.use(
    fileUpload({
      useTempFiles: true,
      tempFileDir: "/tmp",
    })
  )

  const allowedOrigins = [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5173",
  ].filter(Boolean)

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true)
        }
        return callback(new Error("Not allowed by CORS"))
      },
      credentials: true,
    })
  )

  initializeInfra()

  app.use("/v1/auth", userRoutes)
  app.use("/v1/profile", profileRoutes)
  app.use("/v1/course", courseRoutes)
  app.use("/v1/payment", paymentRoutes)
  app.use("/v1/reach", contactUsRoute)

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true })
  })

  return app
}

module.exports = { createApiApp }
