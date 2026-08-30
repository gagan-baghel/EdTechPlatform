import { clientIp } from "../lib/http"
import { fail, parseOrThrow } from "../lib/respond"
import { email as emailSchema, objectId, text } from "../lib/schemas"
import { z } from "zod"
import type { Request, Response } from "express"
import { isDuplicateKeyError } from "../lib/AppError"
import { getEnv } from "../config/env"
import type { AuthedRequest } from "../lib/http"
import User from "../models/User"
import Profile from "../models/Profile"
import OTP from "../models/OTP"
import otpGenrater from "otp-generator"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import mailSender from "../utils/mailSender"
import { passwordUpdated } from "../mail/templates/passwordUpdate"
import crypto from "crypto"
import Session from "../models/Session"

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 200
const MAX_OTP_ATTEMPTS = 5

/**
 * Must match the `expires` on OTP.createdAt. Checked here in code as well,
 * because `autoIndex` is off (connectDB.ts) — if the TTL index has not been
 * created by scripts/ensure-indexes.ts then nothing expires the document and
 * a verification code stays valid indefinitely.
 */
const OTP_TTL_MS = 5 * 60 * 1000

/** JWT lifetime. The login cookie is given the same expiry. */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

/** Length-safe constant-time comparison for short secrets. */
function timingSafeStringEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8")
  const right = Buffer.from(b, "utf8")
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

function getotp() {
  return otpGenrater.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
}

export const sendOTP = async function (req: Request, res: Response) {
  try {

    const { email } = parseOrThrow(
      z.object({ email: emailSchema() }),
      req.body
    );

    const checkExistance = await User.findOne({ email });

    if (checkExistance) {
      return res.status(403).json({
        success: false,
        message: "User already exists",
      });
    }

    // Codes only ever have to be unique per address — signup reads the most
    // recent OTP for the email, never by code alone. The previous loop
    // required global uniqueness across every pending signup and was
    // unbounded, so it got slower as the collection grew and could in
    // principle never terminate.
    const otp = getotp();
    await OTP.deleteMany({ email });


    const otpPayload = { email, otp };

    await OTP.create(otpPayload);

    return res.status(200).json({
      success: true,
      message: "OTP send successfully",
    });


  } catch (error) {
    // Previously interpolated the caught error straight into the response
    // body, handing an unauthenticated caller stack frames and driver
    // messages. `fail` logs the real thing and answers with a safe string.
    return fail(res, error, "sendOTP", "We could not send your verification code. Please try again.")
  }
};


export const signup = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      contactNumber,
      password,
      accountType,
      otp,
    } = parseOrThrow(
      z.object({
        firstName: text({ max: 100, label: "First name" }),
        lastName: text({ max: 100, label: "Last name" }),
        email: emailSchema(),
        contactNumber: z.coerce.string().max(20).optional(),
        password: z
          .string()
          .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
          // bcrypt silently truncates past 72 bytes; a cap here means a long
          // password is rejected rather than quietly weakened.
          .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`),
        confirmPassword: z.string().min(1, "invalid information please provide all fields "),
        accountType: z.enum(["Student", "Instructor"], {
          message: "Please choose either a Student or Instructor account.",
        }),
        otp: z.string().min(1, "invalid information please provide all fields ")
      }).refine((data) => data.password === data.confirmPassword, {
        message: "password is not equal to confirm password",
        path: ["confirmPassword"],
      }),
      req.body
    );

    const checkExistance = await User.findOne({ email });
    if (checkExistance) {
      return res.status(403).json({
        success: false,
        message: "User already exists",
      });
    }

    // "Admin" is deliberately absent — admins are promoted in the database,
    // never self-provisioned through a public endpoint.

    const recentOtp = await OTP.findOne({ email }).sort({ createdAt: -1 })

    if (!recentOtp) {
      return res.status(400).json({
        success: false,
        message: "Your verification code has expired. Please request a new one.",
      });
    }

    // Explicit expiry check — see OTP_TTL_MS.
    if (Date.now() - new Date(recentOtp.createdAt).getTime() > OTP_TTL_MS) {
      await OTP.deleteMany({ email })
      return res.status(400).json({
        success: false,
        message: "Your verification code has expired. Please request a new one.",
      });
    }

    if (recentOtp.attempts >= MAX_OTP_ATTEMPTS) {
      await OTP.deleteMany({ email })
      return res.status(429).json({
        success: false,
        message: "Too many incorrect codes. Please request a new one.",
      });
    }

    if (String(otp).trim() !== String(recentOtp.otp)) {
      await OTP.updateOne({ _id: recentOtp._id }, { $inc: { attempts: 1 } })
      return res.status(400).json({
        success: false,
        message: "That verification code is incorrect.",
      });
    }

    // Consume every outstanding code for this address so none can be replayed.
    await OTP.deleteMany({ email })

    const hashPassword = await bcrypt.hash(password, 10);

    const profileDetails = await Profile.create({
      gender:null,
      dateOfBirth:null,
      about:null,
      contactNumber,
    });

    // The findOne check above is a friendly-message optimisation, not the
    // guarantee — two signups for the same email can both pass it. The
    // unique index on User.email is the real guarantee, and this is what
    // happens when it's the one that catches the race.
    try {
      await User.create({
        firstName,
        lastName,
        email,
        password:hashPassword,
        accountType,
        additionalDetails: profileDetails._id,
        // Encoded: a name containing & or # otherwise truncates the URL and
        // every such user gets a broken avatar.
        userImage: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(`${firstName} ${lastName}`)}`,
      });
    } catch (error) {
      // The Profile was created first (User.additionalDetails is required),
      // so a failed User.create left it behind as an unreachable orphan on
      // every duplicate-email race.
      await Profile.deleteOne({ _id: profileDetails._id }).catch(() => {})

      if (isDuplicateKeyError(error)) {
        return res.status(403).json({
          success: false,
          message: "User already exists",
        });
      }
      throw error
    }



    return res.status(200).json({
        success: true,
        message: "User is registered successfully ",
      });



  } catch (error) {
    return fail(res, error, "signup", "something bad happened signing in and registration error")
  }
};



export const login = async (req: Request, res: Response) => {

    try{

        const {email , password } = parseOrThrow(
          z.object({
            email: emailSchema(),
            password: z.string().min(1, "Incomplete data in login request"),
          }),
          req.body
        );

        const user = await User.findOne({email}).select("+password").populate('additionalDetails');



        if(!user){
            return res.status(400).json({
                success:false,
                message:"User Do not Exists"
            })
        }

        if(await bcrypt.compare(password,user.password)){

            // Checked after the password compare, not before, so a
            // suspended account doesn't get a differently-worded error
            // that would let someone probe suspension status without
            // knowing the password.
            if (user.active === false) {
                return res.status(403).json({
                    success: false,
                    message: "This account has been suspended. Contact support for help.",
                })
            }

            const jti = crypto.randomBytes(16).toString("hex")
            const payload = {
                email:user.email,
                id:user._id,
                accountType:user.accountType,
                jti,
            }

            const token = jwt.sign(payload,getEnv().JWT_SECRET,{
                expiresIn:"24h"
            })

            // Backs "log out everywhere" / "revoke this session" in Settings
            // — see auth.js middleware for the other half of this.
            await Session.create({
                user: user._id,
                jti,
                userAgent: req.headers["user-agent"] || "",
                ip: clientIp(req),
            })


            // password was fetched above (select("+password")) to run the
            // bcrypt compare — strip it before the doc goes into the
            // response. Not setting user.token: the client reads the JWT
            // from the top-level `token` field below, so copying it onto
            // `user` too would just be a second copy of the secret sitting
            // in Redux/localStorage for no benefit.
            user.password = undefined;

            // Matches the JWT's own 24h lifetime. It was 3 days, so for two
            // of those days the browser kept sending a cookie whose token
            // the server had already expired — every request 401ing with a
            // cookie present, which reads as "randomly logged out".
            const options = {
                expires: new Date(Date.now()+TOKEN_TTL_MS),
                httpOnly:true,
                sameSite: "lax" as const,
                secure: process.env.NODE_ENV === "production",
            }

            res.cookie("token",token,options).status(200).json({
                success:true,
                token,
                message:"Login successfull",
                user
            })
        }
        else {
            return res.status(401).json({
                success:false,
                message:"wrong Password"
            })
        }



    } catch (error) {
    return fail(res, error, "login", "Login Error")
  }

    

}



export const changePassword = async (req: AuthedRequest, res: Response) => {

  try{
    

    // confirmNewPassword is optional: the Settings form has never sent it
    // (UpdatePassword.jsx only collects oldPassword + newPassword), so
    // requiring it made this endpoint impossible to succeed from the UI.
    // Still enforced below when a caller does send it.
    const { oldPassword, newPassword } = parseOrThrow(
      z.object({
        oldPassword: z.string().min(1, "invalid information please provide all fields "),
        newPassword: z
          .string()
          .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
          .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`),
        confirmNewPassword: z.string().optional(),
      }).refine(
        (data) => data.confirmNewPassword === undefined || data.newPassword === data.confirmNewPassword,
        {
          message: "The new passwords do not match.",
          path: ["confirmNewPassword"],
        }
      ),
      req.body
    );
  
    const user = await User.findById(req.user.id).select("+password")
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const isPasswordMatch = await bcrypt.compare(
      oldPassword,
      user.password
    );
  
    if(!isPasswordMatch){
      return res
          .status(401)
          .json({ success: false, message: "The password is incorrect" });
  
  
  
    } 

    const hashPassword = await bcrypt.hash(newPassword, 10);

    const updatedUserDetails = await User.findByIdAndUpdate(
      req.user.id,
      { password: hashPassword },
      { new: true }
    );

    // A password change is exactly the moment a stolen token should stop
    // working everywhere else — revoke every OTHER session (not this
    // request's own, so the user isn't logged out mid-flow).
    try {
      await Session.updateMany(
        { user: req.user.id, jti: { $ne: req.user.jti } },
        { $set: { revoked: true } }
      )
    } catch (error) {
      console.error("Session revocation on password change failed", error);
    }

    // The password is already changed. A failed notification email must never
    // be reported to the user as a failed password change.
    try {
      await mailSender(
        updatedUserDetails.email,
        "Your password was changed",
        passwordUpdated(
          updatedUserDetails.email,
          `${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
        )
      );
    } catch (error) {
      console.error("Password-change notification email failed", error);
    }

    return res.status(200).json({
      success:true,
      message:"Your password has been updated."
    })


  } catch (error) {
    return fail(res, error, "changePassword", "We could not update your password. Please try again.")
  }



}

/**
 * Promotes an existing, already-verified user to Admin. This is the only
 * way an Admin account can come to exist — signup explicitly rejects
 * accountType: "Admin" (see above), and that rejection is intentionally
 * left alone by this route: it promotes, it never creates.
 *
 * Gated on a header matching ADMIN_SETUP_KEY rather than req.user/auth,
 * because the whole reason this route exists is that a fresh deployment
 * has no admin account yet to authenticate as. 404s (not 403) when the
 * env var is unset, so the route's existence isn't observable to a caller
 * who doesn't already know the key.
 */
export const bootstrapAdmin = async (req: Request, res: Response) => {
  try {
    const setupKey = getEnv().ADMIN_SETUP_KEY

    if (!setupKey) {
      return res.status(404).json({ success: false, message: "Not found" })
    }

    // Constant-time: a plain !== leaks how many leading characters of the
    // key were right through response timing.
    const presented = req.headers["x-setup-key"]
    if (typeof presented !== "string" || !timingSafeStringEqual(presented, setupKey)) {
      return res.status(404).json({ success: false, message: "Not found" })
    }

    const { email } = parseOrThrow(
      z.object({ email: emailSchema() }),
      req.body
    );

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ success: false, message: "No user with that email" })
    }

    if (user.accountType === "Admin") {
      return res.status(200).json({ success: true, message: "Already an admin" })
    }

    user.accountType = "Admin"
    await user.save()

    return res.status(200).json({ success: true, message: `${email} is now an Admin` })
  } catch (error) {
    return fail(res, error, "bootstrapAdmin", "Could not promote user")
  }
}

/**
 * Actually revokes the current session server-side. Previously "logout"
 * was purely client-side (localStorage.removeItem) — the JWT stayed
 * valid for its full 24h lifetime after a user believed they'd logged out.
 */
export const logout = async (req: AuthedRequest, res: Response) => {
  try {
    if (req.user?.jti) {
      await Session.updateOne({ jti: req.user.jti }, { $set: { revoked: true } })
    }
    res.clearCookie("token")
    return res.status(200).json({ success: true, message: "Logged out" })
  } catch (error) {
    return fail(res, error, "logout", "Could not log out")
  }
}

export const listMySessions = async (req: AuthedRequest, res: Response) => {
  try {
    const sessions = await Session.find({ user: req.user.id, revoked: false })
      .sort({ lastSeenAt: -1 })
      .lean()

    const withCurrent = sessions.map((s: { jti: string }) => ({
        ...s,
        isCurrent: s.jti === req.user.jti,
      }))
    return res.status(200).json({ success: true, data: withCurrent })
  } catch (error) {
    return fail(res, error, "listMySessions", "Could not load sessions")
  }
}

export const revokeSession = async (req: AuthedRequest, res: Response) => {
  try {
    const { sessionId } = parseOrThrow(
      z.object({ sessionId: objectId("A valid session id is required") }),
      req.params
    )
    await Session.updateOne({ _id: sessionId, user: req.user.id }, { $set: { revoked: true } })
    return res.status(200).json({ success: true, message: "Session revoked" })
  } catch (error) {
    return fail(res, error, "revokeSession", "Could not revoke session")
  }
}

/**
 * "Log out everywhere" — revokes every session for this account except
 * the one making the request, so the user isn't immediately logged out
 * of the device they're using to click the button.
 */
export const revokeAllOtherSessions = async (req: AuthedRequest, res: Response) => {
  try {
    await Session.updateMany(
      { user: req.user.id, jti: { $ne: req.user.jti } },
      { $set: { revoked: true } }
    )
    return res.status(200).json({ success: true, message: "Signed out of all other devices" })
  } catch (error) {
    return fail(res, error, "revokeAllOtherSessions", "Could not revoke sessions")
  }
}
