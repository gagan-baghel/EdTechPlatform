const jwt = require('jsonwebtoken')
require('dotenv').config()
const User = require('../models/User')

 
exports.auth = async (req,res,next) => { 
    try {
        const token = req.cookies.token || req.body.token || req.header("Authorization").replace("Bearer ","")

        if(!token){ 
            return res.status(401).json({
                success:false,
                message:"Token Missing"
            })
        }

        try {
            
            const decode = await jwt.verify(token,process.env.JWT_SECRET)
            req.user = decode;

        } catch (error) {
            return res.status(401).json({
                success:false,
                message:"token issue middleware"
            })
            
        }
        next()
        
    } catch (error) {

        console.log(error,"  error while doing auth middleware (COOKIE NOT VALID )")

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