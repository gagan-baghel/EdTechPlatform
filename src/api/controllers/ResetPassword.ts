import type { Request, Response } from "express"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { z } from "zod"

import { requireSiteUrl } from "@/lib/siteUrl"
import { hashToken } from "../lib/crypto"
import { fail, parseOrThrow } from "../lib/respond"
import { email as emailSchema, text } from "../lib/schemas"
import User from "../models/User"
import Session from "../models/Session"
import mailSender from "../utils/mailSender"

const MIN_PASSWORD_LENGTH = 8
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000

/**
 * Password reset.
 *
 * Two things this file gets wrong very easily, both of which it previously did:
 *
 *  1. `const { email } = req.body` then `User.findOne({ email })`. Express
 *     parses `{"token": {"$gt": ""}}` into an object, Mongoose accepts `$gt`
 *     as a query operator, and the lookup then matches the first account with
 *     ANY outstanding reset token — a full account takeover with one request.
 *     Every value that reaches a query here now goes through Zod first.
 *
 *  2. Storing the reset token verbatim. Anyone who can read the users
 *     collection (a backup, a log, an aggregation endpoint that forgets a
 *     projection) can complete a reset for every account with one pending.
 *     Only the SHA-256 hash is stored; the raw token exists solely inside the
 *     email. Tokens issued before this change no longer resolve, which costs
 *     at most one re-request within their 15-minute window.
 */

const RequestResetSchema = z.object({ email: emailSchema() })

const ResetSchema = z
  .object({
    token: text({ max: 200, label: "Reset token" }),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      .max(200, "Password must be at most 200 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  })

export const resetPasswordToken = async (req: Request, res: Response) => {
  // Always the same response, so this endpoint cannot be used to discover
  // which email addresses have accounts.
  const genericResponse = {
    success: true,
    message: "If that email address has an account, a reset link is on its way.",
  }

  try {
    const { email } = parseOrThrow(RequestResetSchema, req.body)

    // Resolved before the user lookup so a misconfigured deployment fails
    // here rather than after minting a token nobody can use.
    const baseUrl = requireSiteUrl()

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(200).json(genericResponse)
    }

    const token = crypto.randomBytes(32).toString("hex")

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          token: hashToken(token),
          resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      }
    )

    const url = `${baseUrl}/update-password/${token}`

    await mailSender(
      email,
      "Reset your IntelleCraft password",
      `<p>We received a request to reset your password.</p>
       <p><a href="${url}">Choose a new password</a></p>
       <p>This link expires in 15 minutes. If you did not request it, you can safely ignore this email.</p>`
    )

    return res.status(200).json(genericResponse)
  } catch (error) {
    return fail(res, error, "resetPasswordToken", "We could not send the reset email. Please try again.")
  }
}

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { password, token } = parseOrThrow(ResetSchema, req.body)

    // Single atomic claim. A read-then-write here would let two submissions
    // of the same link both pass the expiry check; consuming the token as
    // part of the match means only one can win.
    const user = await User.findOneAndUpdate(
      {
        token: hashToken(token),
        resetPasswordExpires: { $gt: new Date() },
      },
      { $unset: { token: 1, resetPasswordExpires: 1 } }
    ).select("+token")

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "This reset link is invalid, expired, or has already been used.",
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } })

    // A password-reset link implies "I may have lost control of my account" —
    // unlike changePassword, there is no session making this request to
    // preserve, so every session is revoked.
    try {
      await Session.updateMany({ user: user._id }, { $set: { revoked: true } })
    } catch (error) {
      console.error("Session revocation on password reset failed", error)
    }

    return res.status(200).json({
      success: true,
      message: "Your password has been reset. You can now log in.",
    })
  } catch (error) {
    return fail(res, error, "resetPassword", "We could not reset your password. Please try again.")
  }
}
