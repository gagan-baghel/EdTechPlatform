import express from "express"
import { authedHandler } from "../lib/http"
const router = express.Router()

import { getMyReferralCode, setReferrer, listMyReferrals } from "../controllers/Affiliate"
import { auth } from "../middlewares/auth"

router.get("/my-code", auth, authedHandler(getMyReferralCode, "getMyReferralCode"))
router.post("/set-referrer", auth, authedHandler(setReferrer, "setReferrer"))
router.get("/my-referrals", auth, authedHandler(listMyReferrals, "listMyReferrals"))
export default router