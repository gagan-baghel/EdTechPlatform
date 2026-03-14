const express = require("express")
const fileUpload = require("express-fileupload")
const cookieParser = require("cookie-parser")

const userRoutes = require("./routes/userRoutes")
const profileRoutes = require("./routes/profileRoutes")
const paymentRoutes = require("./routes/paymentRoutes")
const courseRoutes = require("./routes/courseRoutes")
const contactUsRoute = require("./routes/Contact")

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
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(
    fileUpload({
      useTempFiles: true,
      tempFileDir: "/tmp",
      createParentPath: true,
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

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true })
  })

  app.get("/v1/health", (_req, res) => {
    res.status(200).json({ success: true })
  })

  return app
}

module.exports = { createApiApp }
