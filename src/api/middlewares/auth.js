const jwt = require('jsonwebtoken')
require('dotenv').config()
const User = require('../models/User')
const Session = require('../models/Session')


exports.auth = async (req,res,next) => {
    try {
        const authHeader = req.header("Authorization")
        const bearerToken = authHeader && authHeader.startsWith("Bearer ")
            ? authHeader.replace("Bearer ", "")
            : null
        const token = req.cookies.token || req.body.token || bearerToken

        if(!token){
            return res.status(401).json({
                success:false,
                message:"Token Missing"
            })
        }

        let decode
        try {
            decode = await jwt.verify(token,process.env.JWT_SECRET)
        } catch (error) {
            return res.status(401).json({
                success:false,
                message:"token issue middleware"
            })
        }

        // jti backs real session revocation (log out everywhere, revoke one
        // device) — a JWT alone stays valid for its full 24h no matter what.
        // Tokens issued before this shipped have no jti; those are let
        // through once more rather than instantly logging out everyone
        // already signed in, and age out naturally within 24h.
        if (decode.jti) {
            const session = await Session.findOneAndUpdate(
                { jti: decode.jti, revoked: false },
                { $set: { lastSeenAt: new Date() } }
            )
            if (!session) {
                return res.status(401).json({
                    success:false,
                    message:"Session has been revoked. Please log in again."
                })
            }
        }

        req.user = decode
        next()

    } catch (error) {


        return res.status(401).json({
            success:false,
            message:"auth error"
        })
        
    }

}



exports.isStudent = (req,res,next) => {
    try {
        if(req.user.accountType !== "Student" ){

            return res.status(401).json({
                success:false,
                message:"This is a protected route for student"
            })

        }

        next()
        
    } catch (error) {

        return res.status(500).json({
            success:false,
            message:"Role cannot be verified plewase try again or login again"
        })
        
    }
}


exports.isInstructor = (req,res,next) => {
    try {
        if(req.user.accountType !== "Instructor" ){

            return res.status(401).json({
                success:false,
                message:"This is a protected route for Instructor"
            })

        }

        next()
        
    } catch (error) {

        return res.status(500).json({
            success:false,
            message:"Role cannot be verified plewase try again or login again"
        })
        
    }
}


exports.isAdmin = (req,res,next) => {
    try {
        
        if(req.user.accountType !== "Admin" ){
            
            return res.status(401).json({
                success:false,
                message:"This is a protected route for Admin"
            })

        }

        next()
        
    } catch (error) {

        return res.status(500).json({
            success:false,
            message:"Role cannot be verified plewase try again or login again"
        })
        
    }
}
