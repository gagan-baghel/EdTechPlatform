const User = require("../models/User");
const Profile = require("../models/Profile");
const OTP = require("../models/OTP");
const otpGenrater = require("otp-generator");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
require('dotenv').config()
const mailSender = require('../utils/mailSender')

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

    const checkExistance = await User.findOne({ email });

    if (checkExistance) {
      res.status(403).json({
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

    res.status(200).json({
      success: true,
      message: "OTP send successfully",
      otp,
    });


  } catch (error) {
    console.log(error);
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

    const recentOtp = await OTP.findOne({ email })
      .sort({ createdAt: -1 })
      .limit(1) || [];


    if (recentOtp.length == 0) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or expired",
      });
      
    } else if (otp != recentOtp.otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }



    const hashPassword = await bcrypt.hash(password, 10);




    // let approved = "";
		// approved === "Instructor" ? (approved = false) : (approved = true);


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
    console.log("something bad happened while signing in tryCatch" ,error);

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

            token = jwt.sign(payload,process.env.JWT_SECRET,{
                expiresIn:"24h"
            })

            console.log(user)

            user.token = token;
            user.password=null;

            const options = {
                expires: new Date(Date.now()+3*24*60*60*1000),
                httpOnly:true
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
                success:true,
                message:"wrong Password"
            })
        }



    }catch(error){

        console.log(error,"login Faliur")
        res.status(500).json({
            success:false,
            message:"Login Error"
        })

    }

    

}



exports.changePassword = async (req,res) => {

  try{
    

    const {oldPassword,newpassword,confirmNewPassword} = req.body;
  
    if (
      !oldPassword ||
      !confirmNewPassword ||
      !newpassword
    ) {
  
      return res.status(403).json({
        success: false,
        message: "invalid information please provide all fields ",
      });
  
    }
  
    const user = User.findById(req.user.id)
  
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
        message: "The password and confirm password does not match",
      });
    }
  
  
    const hashPassword = await bcrypr.hash(newpassword, 10);
  
    const updatedUserDetails = await User.findByIdAndUpdate(
      req.user.id,
      { password: hashPassword },
      { new: true }
    );
  
    console.log(updatedUserDetails)
  
    try {
      const emailResponse = await mailSender(
        updatedUserDetails.email,
        passwordUpdated(
          updatedUserDetails.email,
          `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
        )
      );
      console.log("Email sent successfully:", emailResponse.response);
    } catch (error) {
      // If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
      console.error("Error occurred while sending email:", error);
      return res.status(500).json({
        success: false,
        message: "Error occurred while sending email",
        error: error.message,
      });
    }
  
    return res.status(200).json({
      success:true,
      message:"password changes successfully"
    })
  
  
  } catch (error) {
  
    console.log("something bad happened while resetting the password",error)
    
    return res.status(400).json({
      success:false,
      message:"something bad happened"
    })
      
  }



}