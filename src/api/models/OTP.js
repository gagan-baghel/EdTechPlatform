const mongoose = require('mongoose')
const mailSender  = require('../utils/mailSender')
const otpTemplate = require('../mail/templates/emailVerificationTemplate')


const OTPSchema = new  mongoose.Schema({

    email:{
        type:String, 
        required:true
    },
    otp : {
        type:Number,
        required:true,
    },
    createdAt:{
        type:Date,
        default:Date.now,
        expires:5*60,
    }

})

// afunction to send email

async function sendVerificationEmail(email,otp){
    
    try {

        
        const mailResponse = await mailSender(
            email,
            "Verification E-mail for StudyNotion ",
            otpTemplate(otp));

        
    } catch (error) {
        throw error;
    }

}

OTPSchema.pre('save',async function(next){
    
    if(this.isNew){
        await sendVerificationEmail(this.email,this.otp)
    }
    
    next()
})

module.exports = mongoose.models.OTP || mongoose.model("OTP",OTPSchema)
