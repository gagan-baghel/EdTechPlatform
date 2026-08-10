const express = require("express")
const router = express.Router()

const { getMyCertificates, verifyCertificate } = require("../controllers/Certificate")
const { auth } = require("../middlewares/auth")
const { rateLimit } = require("../middlewares/rateLimit")

const verifyLimiter = rateLimit({ name: "certificate-verify", max: 30, windowMs: 15 * 60 * 1000 })

router.get("/mine", auth, getMyCertificates)
// Public, no auth — a certificate exists to be verified by a third party
// (an employer) who has no account on this platform. Rate-limited anyway,
// same defense-in-depth reasoning as every other unauthenticated route.
router.get("/verify/:certificateNumber", verifyLimiter, verifyCertificate)

module.exports = router
