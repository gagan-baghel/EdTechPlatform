const express= require('express')
const router = express.Router();

const  {sendOTP, signup, login, changePassword} = require('../controllers/Auth')

const {
    resetPasswordToken,
    resetPassword,
  } = require("../controllers/ResetPassword")


const {auth} = require("../middlewares/auth.js")
const { rateLimit } = require("../middlewares/rateLimit")

const MINUTE = 60 * 1000

// Credential and code-entry endpoints are the brute-force surface.
const signupLimiter = rateLimit({ name: "signup", max: 10, windowMs: 15 * MINUTE, byEmail: true })
const otpLimiter = rateLimit({ name: "sendotp", max: 5, windowMs: 15 * MINUTE, byEmail: true })
const loginLimiter = rateLimit({ name: "login", max: 10, windowMs: 15 * MINUTE, byEmail: true })
const resetLimiter = rateLimit({ name: "reset", max: 5, windowMs: 15 * MINUTE, byEmail: true })


router.post("/signup", signupLimiter, signup)

router.post("/sendotp", otpLimiter, sendOTP)


router.post("/login", loginLimiter, login)


router.post("/changePassword",auth,changePassword)

router.post("/reset-password-token", resetLimiter, resetPasswordToken)

router.post("/reset-password", resetLimiter, resetPassword)

module.exports = router