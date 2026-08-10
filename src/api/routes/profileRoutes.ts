import express from "express"
import { authedHandler } from "../lib/http"
const router = express.Router()
import { auth,isInstructor } from "../middlewares/auth"
import {
  deleteAccount,
  updateProfile,
  getAllUserDetails,
  updateDisplayPicture,
  getEnrolledCourses,
  instructorDashboard,
  completeOnboarding,
  exportMyData,
  updatePreferences,
} from "../controllers/Profile"// ********************************************************************************************************
//                                      Profile routes
// ********************************************************************************************************
// Delet User Account
router.delete("/deleteProfile", auth, authedHandler(deleteAccount, "deleteAccount"))
router.put("/updateProfile", auth, authedHandler(updateProfile, "updateProfile"))
router.get("/getUserDetails", auth, authedHandler(getAllUserDetails, "getAllUserDetails"))
// Get Enrolled Courses
router.get("/getEnrolledCourses", auth, authedHandler(getEnrolledCourses, "getEnrolledCourses"))
router.put("/updateDisplayPicture", auth, authedHandler(updateDisplayPicture, "updateDisplayPicture"))
router.get("/instructorDashboard", auth, isInstructor, authedHandler(instructorDashboard, "instructorDashboard"))
router.put("/completeOnboarding", auth, authedHandler(completeOnboarding, "completeOnboarding"))
router.get("/exportData", auth, authedHandler(exportMyData, "exportMyData"))
router.put("/preferences", auth, authedHandler(updatePreferences, "updatePreferences"))
export default router