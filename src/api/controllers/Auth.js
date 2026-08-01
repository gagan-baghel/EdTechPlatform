const User = require("../models/User");
const Profile = require("../models/Profile");
const OTP = require("../models/OTP");
const otpGenrater = require("otp-generator");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
require('dotenv').config()
const mailSender = require('../utils/mailSender')
const { passwordUpdated } = require("../mail/templates/passwordUpdate")

const MIN_PASSWORD_LENGTH = 8
const MAX_OTP_ATTEMPTS = 5

function getotp() {
  return otpGenrater.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
}

exports.sendOTP = async function (req, res) {
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

    const createdOTP = await OTP.create(otpPayload);

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


exports.signup = async (req, res) => {
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

    const user = await User.create({
      firstName,
      lastName,
      email,
      password:hashPassword,
      accountType,
      additionalDetails: profileDetails._id,
      userImage: `https://api.dicebear.com/7.x/initials/svg?seed=${firstName} ${lastName}`,
    });



    return res.status(200).json({
        success: true,
        message: "User is registered successfully ",
      });



  } catch (error) {

    return res.status(500).json({
        success: false,
        message: "something bad happened signing in and registration error",
      });


  }
};



exports.login = async (req,res)=>{

    try{

        const {email , password } = req.body 

        if(!email || !password){
            return res.status(400).json({
                success:false,
                message:"Incomplete data in login request"
            })
        }

        const user = await User.findOne({email}).populate('additionalDetails');



        if(!user){
            return res.status(400).json({
                success:false,
                message:"User Do not Exists"
            })
        }

        if(await bcrypt.compare(password,user.password)){

            const payload = {
                email:user.email,
                id:user._id,
                accountType:user.accountType
            }

            const token = jwt.sign(payload,process.env.JWT_SECRET,{
                expiresIn:"24h"
            })


            user.token = token;
            user.password=null;

            const options = {
                expires: new Date(Date.now()+3*24*60*60*1000),
                httpOnly:true,
                sameSite: "lax",
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



    }catch(error){

        res.status(500).json({
            success:false,
            message:"Login Error"
        })

    }

    

}



exports.changePassword = async (req,res) => {

  try{
    

    const { oldPassword, newPassword, confirmNewPassword } = req.body;
  
    if (
      !oldPassword ||
      !confirmNewPassword ||
      !newPassword
    ) {
  
      return res.status(403).json({
        success: false,
        message: "invalid information please provide all fields ",
      });
  
    }
  
    const user = await User.findById(req.user.id)
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
  
    if (newPassword !== confirmNewPassword) {
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
