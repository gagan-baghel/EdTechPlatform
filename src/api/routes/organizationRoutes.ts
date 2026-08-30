import express from "express"
import { authedHandler } from "../lib/http"
const router = express.Router()

import { createOrganization, getMyOrganizations, joinOrganization } from "../controllers/Organization"
import { auth, isAdmin } from "../middlewares/auth"

// Admin-only: creating an organisation grants free enrolment in the courses
// it lists, and there is no self-serve purchase path for seats. See the
// SECURITY note in the controller — this route previously took any logged-in
// user and was a complete checkout bypass.
router.post("/", auth, isAdmin, authedHandler(createOrganization, "createOrganization"))
router.get("/mine", auth, isAdmin, authedHandler(getMyOrganizations, "getMyOrganizations"))
router.post("/join", auth, authedHandler(joinOrganization, "joinOrganization"))
export default router