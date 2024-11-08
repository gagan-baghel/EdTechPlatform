const User = require('../models/User')
const mailSender = require('../utils/mailSender')
const bcrypt = require('bcrypt')
const crypto = require('crypto')



exports.resetPasswordToken = async (req,res)=>{

    try {
        const {email} = req.body
        
        const user = await User.findOne({email})
        
        if(!user){
            return res.status(400).json({
                success:false,
                message:"User donot exists"
            })
        }
        
        const token = crypto.randomBytes(20).toString("hex");
        
        const updatedDetails = await User.findOneAndUpdate({email},{
            token,
            resetPasswordExpires:Date.now()+5*60*1000
        },{new:true})

        console.log(updatedDetails)
        
        const url = "https://edtechplatform-3.onrender.com"+`/update-password/${token}`

        console.log("initiating mail")
        
        await mailSender(email,"Reset Password Link for StudyNotion", `your password reset link is --->  ${url}`)
        
        return res.status(200).json({
            success:true,
            message: "mail send to email,Please check email and change password"
        })
        
    } catch (error) {

        console.log(error,"error in reset password token genration")

        return res.status(500).json({
            success:false,
            message: "error in reset password token genration"
        })


    }

}


exports.resetPassword  = async (req,res) =>{

    try {

        const {password, confirmPassword, token } = req.body

        if(password!==confirmPassword){
            return res.status(400).json({
                success:false,
                message: "please check both password while resetting because Password dont match"
            })
        }

        const user = await User.findOne({token})

        if(!user){
            return res.status(400).json({
                success:false,
                message: "token Invalid"
            })
        }
 
        if(user.resetPasswordExpires < Date.now()){
            return res.status(400).json({
                success:false,
                message: "reset Password token Expired"
            })
        }

        const hashedPassword = await bcrypt.hash(password,10)

        const updatedUser = await User.findOneAndUpdate({token},{password:hashedPassword},{new:true})

        return res.status(200).json({ 
            success:true,
            message: "password Updated through reset Password"
        })



        
    } catch (error) {
        console.log(error,"error in reset password ")

        return res.status(500).json({
            success:false,
            message: "error in reset password"
        })
    }
}