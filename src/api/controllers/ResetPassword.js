const User = require('../models/User')
const Session = require('../models/Session')
const mailSender = require('../utils/mailSender')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const MIN_PASSWORD_LENGTH = 8
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000

/**
 * The reset link origin is taken from configuration, never from request headers.
 * Trusting x-forwarded-host lets an attacker point a victim's reset link at
 * their own domain and harvest the token.
 */
function getAppBaseUrl(req) {
    const configured =
        process.env.APP_BASE_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")

    if (configured) {
        // Tolerate a value set without a protocol, which is easy to do in a
        // hosting dashboard, rather than breaking password reset over it.
        const withProtocol = /^https?:\/\//i.test(configured)
            ? configured
            : `https://${configured}`
        return withProtocol.replace(/\/+$/, "")
    }

    if (process.env.NODE_ENV === "production") {
        // Fail loudly in production rather than emitting an attacker-controlled link.
        throw new Error("APP_BASE_URL is not configured")
    }

    const host = req.headers.host || "localhost:3000"
    return `${req.protocol || "http"}://${host}`
}

exports.resetPasswordToken = async (req, res) => {
    // Always the same response, so this endpoint cannot be used to discover
    // which email addresses have accounts.
    const genericResponse = {
        success: true,
        message: "If that email address has an account, a reset link is on its way.",
    }

    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Please enter your email address.",
            })
        }

        const user = await User.findOne({ email })

        if (!user) {
            return res.status(200).json(genericResponse)
        }

        const token = crypto.randomBytes(32).toString("hex")

        await User.updateOne(
            { _id: user._id },
            {
                $set: {
                    token,
                    resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
                },
            }
        )

        const url = `${getAppBaseUrl(req)}/update-password/${token}`

        await mailSender(
            email,
            "Reset your IntelleCraft password",
            `<p>We received a request to reset your password.</p>
             <p><a href="${url}">Choose a new password</a></p>
             <p>This link expires in 15 minutes. If you did not request it, you can safely ignore this email.</p>`
        )

        return res.status(200).json(genericResponse)

    } catch (error) {
        console.error("resetPasswordToken failed", error)
        return res.status(500).json({
            success: false,
            message: "We could not send the reset email. Please try again.",
        })
    }
}

exports.resetPassword = async (req, res) => {
    try {
        const { password, confirmPassword, token } = req.body

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "This reset link is invalid.",
            })
        }

        if (!password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Please enter and confirm your new password.",
            })
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "The passwords do not match.",
            })
        }

        if (String(password).length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({
                success: false,
                message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
            })
        }

        const user = await User.findOne({ token })

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "This reset link is invalid or has already been used.",
            })
        }

        if (!user.resetPasswordExpires || user.resetPasswordExpires < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "This reset link has expired. Please request a new one.",
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        // $unset is required — Mongoose strips `undefined` from updates, which
        // would silently leave the token live for its full window.
        await User.updateOne(
            { _id: user._id },
            {
                $set: { password: hashedPassword },
                $unset: { token: 1, resetPasswordExpires: 1 },
            }
        )

        // A password-reset link implies "I may have lost control of my
        // account" — unlike changePassword, there is no session making
        // this request to preserve, so every session is revoked.
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
        console.error("resetPassword failed", error)
        return res.status(500).json({
            success: false,
            message: "We could not reset your password. Please try again.",
        })
    }
}
