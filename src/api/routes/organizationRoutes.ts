import express from "express"
import { authedHandler } from "../lib/http"
const router = express.Router()

import { createOrganization, getMyOrganizations, joinOrganization } from "../controllers/Organization"
import { auth } from "../middlewares/auth"

router.post("/", auth, authedHandler(createOrganization, "createOrganization"))
router.get("/mine", auth, authedHandler(getMyOrganizations, "getMyOrganizations"))
router.post("/join", auth, authedHandler(joinOrganization, "joinOrganization"))
export default router