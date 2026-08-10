import { Schema } from "mongoose"

import type { Otp as OtpEntity } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

import mailSender from "../utils/mailSender"
import otpTemplate from "../mail/templates/emailVerificationTemplate"


const OTPSchema = new Schema<SchemaOf<OtpEntity<ObjectId>>>({

    email:{
        type:String, 
        required:true
    },
    otp : {
        type:Number,
        required:true,
    },
    // Incremented on each failed verification so a code cannot be brute-forced.
    attempts:{
        type:Number,
        default:0,
    },
    createdAt:{
        type:Date,
        default:Date.now,
        expires:5*60,
    }

})

// afunction to send email

async function sendVerificationEmail(email: string, otp: number) {
    
    try {

        
        await mailSender(
            email,
            "Verification E-mail for IntelleCraft ",
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
export const OTP = defineModel("OTP", OTPSchema)
export default OTP