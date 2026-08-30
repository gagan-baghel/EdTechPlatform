import express from "express"
import { asyncHandler, authedHandler } from "../lib/http"
const router = express.Router();

import {
    sendOTP,
    signup,
    login,
    changePassword,
    bootstrapAdmin,
    logout,
    listMySessions,
    revokeSession,
    revokeAllOtherSessions,
} from "../controllers/Auth"
import {
    resetPasswordToken,
    resetPassword,
  } from "../controllers/ResetPassword"
import {auth} from "../middlewares/auth"
import { rateLimit } from "../middlewares/rateLimit"

const MINUTE = 60 * 1000

// Credential and code-entry endpoints are the brute-force surface.
const signupLimiter = rateLimit({ name: "signup", max: 10, windowMs: 15 * MINUTE, byEmail: true })
const otpLimiter = rateLimit({ name: "sendotp", max: 5, windowMs: 15 * MINUTE, byEmail: true })
const loginLimiter = rateLimit({ name: "login", max: 10, windowMs: 15 * MINUTE, byEmail: true })
const resetLimiter = rateLimit({ name: "reset", max: 5, windowMs: 15 * MINUTE, byEmail: true })
const bootstrapAdminLimiter = rateLimit({ name: "bootstrap-admin", max: 5, windowMs: 15 * MINUTE, byEmail: true })


router.post("/signup", signupLimiter, asyncHandler(signup, "signup"))

router.post("/sendotp", otpLimiter, asyncHandler(sendOTP, "sendOTP"))


router.post("/login", loginLimiter, asyncHandler(login, "login"))


router.post("/changePassword",auth,authedHandler(changePassword, "changePassword"))

router.post("/logout", auth, authedHandler(logout, "logout"))
router.get("/sessions", auth, authedHandler(listMySessions, "listMySessions"))
router.delete("/sessions/:sessionId", auth, authedHandler(revokeSession, "revokeSession"))
router.post("/sessions/revoke-others", auth, authedHandler(revokeAllOtherSessions, "revokeAllOtherSessions"))

router.post("/reset-password-token", resetLimiter, asyncHandler(resetPasswordToken, "resetPasswordToken"))

router.post("/reset-password", resetLimiter, asyncHandler(resetPassword, "resetPassword"))

// No auth middleware — see the doc comment on bootstrapAdmin in Auth.js for
// why. Disabled unless ADMIN_SETUP_KEY is set in the environment.
router.post("/bootstrap-admin", bootstrapAdminLimiter, asyncHandler(bootstrapAdmin, "bootstrapAdmin"))
export default router