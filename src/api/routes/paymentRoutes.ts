import { authedHandler } from "../lib/http"
// Import the required modules
import express from "express"
const router = express.Router()

import { capturePayment, verifyPayment, sendPaymentSuccessEmail, createPaymentEntry,getUserPaymentEntries} from "../controllers/Payments"
import { auth, isStudent } from "../middlewares/auth"

router.post("/capturePayment", auth, isStudent, authedHandler(capturePayment, "capturePayment"))
router.post("/verifyPayment",auth, isStudent, authedHandler(verifyPayment, "verifyPayment"))
router.post("/sendPaymentSuccessEmail", auth, isStudent, authedHandler(sendPaymentSuccessEmail, "sendPaymentSuccessEmail"));
router.post("/createPaymentEntry", auth, isStudent, authedHandler(createPaymentEntry, "createPaymentEntry"));
router.get("/getUserPaymentsDetails",auth,isStudent,authedHandler(getUserPaymentEntries, "getUserPaymentEntries"))
export default router