import express from "express"
import { authedHandler } from "../lib/http"
const router = express.Router()

import { getMyCertificates, verifyCertificate } from "../controllers/Certificate"
import { auth } from "../middlewares/auth"
import { rateLimit } from "../middlewares/rateLimit"

const verifyLimiter = rateLimit({ name: "certificate-verify", max: 30, windowMs: 15 * 60 * 1000 })

router.get("/mine", auth, authedHandler(getMyCertificates, "getMyCertificates"))
// Public, no auth — a certificate exists to be verified by a third party
// (an employer) who has no account on this platform. Rate-limited anyway,
// same defense-in-depth reasoning as every other unauthenticated route.
router.get("/verify/:certificateNumber", verifyLimiter, verifyCertificate)
export default router