import { clientIp } from "../lib/http"
import { fail } from "../lib/respond"
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
const MAX_OTP_ATTEMPTS = 5

function getotp() {
  return otpGenrater.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
}

export const sendOTP = async function (req: Request, res: Response) {
  try {

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      })
    }

    const checkExistance = await User.findOne({ email });

    if (checkExistance) {
      return res.status(403).json({
        success: false,
        message: "User already exists",
      });
    }

    let otp = getotp();
    let otpFindResult = await OTP.findOne({ otp });

    while (otpFindResult) {
      otp = getotp();
      otpFindResult = await OTP.findOne({ otp });
    }


    const otpPayload = { email, otp };

    await OTP.create(otpPayload);

    return res.status(200).json({
      success: true,
      message: "OTP send successfully",
    });


  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `error created white making otp ${error}`,
    });
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
      confirmPassword,
      accountType,
      otp,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !confirmPassword||
      !password ||
      !otp
    ) {
      return res.status(403).json({
        success: false,
        message: "invalid information please provide all fields ",
      });
    }

    if (password !== confirmPassword) {
      return res.status(403).json({
        success: false,
        message: "password is not equal to confirm password",
      });
    }

    const checkExistance = await User.findOne({ email });
    if (checkExistance) {
      return res.status(403).json({
        success: false,
        message: "User already exists",
      });
    }

    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    // "Admin" is deliberately absent — admins are promoted in the database,
    // never self-provisioned through a public endpoint.
    if (!accountType || !["Student", "Instructor"].includes(accountType)) {
      return res.status(400).json({
        success: false,
        message: "Please choose either a Student or Instructor account.",
      })
    }

    const recentOtp = await OTP.findOne({ email }).sort({ createdAt: -1 })

    if (!recentOtp) {
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
        userImage: `https://api.dicebear.com/7.x/initials/svg?seed=${firstName} ${lastName}`,
      });
    } catch (error) {
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

        const {email , password } = req.body 

        if(!email || !password){
            return res.status(400).json({
                success:false,
                message:"Incomplete data in login request"
            })
        }

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

            const options = {
                expires: new Date(Date.now()+3*24*60*60*1000),
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
    

    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    // confirmNewPassword is optional: the Settings form has never sent it
    // (UpdatePassword.jsx only collects oldPassword + newPassword), so
    // requiring it made this endpoint impossible to succeed from the UI.
    // Still enforced below when a caller does send it.
    if (!oldPassword || !newPassword) {

      return res.status(403).json({
        success: false,
        message: "invalid information please provide all fields ",
      });

    }
  
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
  
    if (confirmNewPassword !== undefined && newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: "The new passwords do not match.",
      });
    }

    if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
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

    console.error("changePassword failed", error);
    return res.status(500).json({
      success:false,
      message:"We could not update your password. Please try again."
    })

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

    if (req.headers["x-setup-key"] !== setupKey) {
      return res.status(404).json({ success: false, message: "Not found" })
    }

    const { email } = req.body
    if (!email) {
      return res.status(400).json({ success: false, message: "email is required" })
    }

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
    console.error("bootstrapAdmin failed", error)
    return res.status(500).json({ success: false, message: "Could not promote user" })
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
    const { sessionId } = req.params
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
