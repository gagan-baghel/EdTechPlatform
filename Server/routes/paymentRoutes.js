// Import the required modules
const express = require("express")
const router = express.Router()

const { capturePayment, verifyPayment, sendPaymentSuccessEmail, createPaymentEntry,getUserPaymentEntries} = require("../controllers/Payments")
const { auth, isInstructor, isStudent, isAdmin } = require("../middlewares/auth")

router.post("/capturePayment", auth, isStudent, capturePayment)
router.post("/verifyPayment",auth, isStudent, verifyPayment)
router.post("/sendPaymentSuccessEmail", auth, isStudent, sendPaymentSuccessEmail);
router.post("/createPaymentEntry", auth, isStudent, createPaymentEntry);
router.get("/getUserPaymentsDetails",auth,isStudent,getUserPaymentEntries)



module.exports = router

