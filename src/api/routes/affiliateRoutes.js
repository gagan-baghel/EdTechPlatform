const express = require("express")
const router = express.Router()

const { getMyReferralCode, setReferrer, listMyReferrals } = require("../controllers/Affiliate")
const { auth } = require("../middlewares/auth")

router.get("/my-code", auth, getMyReferralCode)
router.post("/set-referrer", auth, setReferrer)
router.get("/my-referrals", auth, listMyReferrals)

module.exports = router
