const express= require('express')
const router = express.Router();

const  {sendOTP, signup, login, changePassword} = require('../controllers/Auth')

const {
    resetPasswordToken,
    resetPassword,
  } = require("../controllers/ResetPassword")


const {auth} = require("../middlewares/auth.js")


router.post("/signup",signup)

router.post("/sendotp",sendOTP)


router.post("/login",login)


router.post("/changePassword",auth,changePassword)

router.post("/reset-password-token", resetPasswordToken)

router.post("/reset-password", resetPassword)

module.exports = router