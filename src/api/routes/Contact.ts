import express from "express"

import { contactUsController } from "../controllers/ContactUs"
import { asyncHandler } from "../lib/http"
import { rateLimit } from "../middlewares/rateLimit"

const router = express.Router()

// Unauthenticated and it sends mail, so it is a spam amplifier without a
// ceiling. Scoped by email as well as IP so one address cannot be used to
// flood the support inbox from a rotating set of IPs.
const contactLimiter = rateLimit({
  name: "contact",
  max: 5,
  windowMs: 60 * 60 * 1000,
  byEmail: true,
})

router.post("/contact", contactLimiter, asyncHandler(contactUsController, "contactUs"))

export default router
