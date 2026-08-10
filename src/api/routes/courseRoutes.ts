import { authedHandler } from "../lib/http"
// Import the required modules
import express from "express"
const router = express.Router()

// Import the Controllers

// Course Controllers Import
import {
  createCourse,
  getAllCourses,
  getCourseDetails,
  getFullCourseDetails,
  editCourse,
  getInstructorCourses,
  deleteCourse,
  searchCourses,
  duplicateCourse,
} from "../controllers/Course"// Tags Controllers Import

// Categories Controllers Import
import {
  showAllCategories,
  createCategory,
  categoryPageDetails,
} from "../controllers/Category"// Sections Controllers Import
import {
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
} from "../controllers/Section"// Sub-Sections Controllers Import
import {
  createSubSection,
  updateSubSection,
  deleteSubSection,
  getVideoUploadSignature,
  reorderSubSections,
  addAttachment,
  removeAttachment,
} from "../controllers/Subsection"// Rating Controllers Import
import {
  createRating,
  getAllRatingReview,
} from "../controllers/RatingAndReview"
import {
  updateCourseProgress,
  getProgressPercentage,
  updateWatchPosition,
} from "../controllers/courseProgress"// Importing Middlewares
import { auth, isInstructor, isStudent, isAdmin } from "../middlewares/auth"

// ********************************************************************************************************
//                                      Course routes
// ********************************************************************************************************

// Courses can Only be Created by Instructors
router.post("/createCourse", auth, isInstructor, authedHandler(createCourse, "createCourse"))
// Edit Course routes
router.post("/editCourse", auth, isInstructor, authedHandler(editCourse, "editCourse"))
//Add a Section to a Course
router.post("/addSection", auth, isInstructor, authedHandler(createSection, "createSection"))
// Update a Section
router.post("/updateSection", auth, isInstructor, authedHandler(updateSection, "updateSection"))
// Delete a Section
router.post("/deleteSection", auth, isInstructor, authedHandler(deleteSection, "deleteSection"))
// Persist a new section order (drag-drop curriculum builder, P2)
router.post("/reorderSections", auth, isInstructor, authedHandler(reorderSections, "reorderSections"))
// Persist a new lecture order within a section
router.post("/reorderSubSections", auth, isInstructor, authedHandler(reorderSubSections, "reorderSubSections"))
// Edit Sub Section
router.post("/updateSubSection", auth, isInstructor, authedHandler(updateSubSection, "updateSubSection"))
// Delete Sub Section
router.post("/deleteSubSection", auth, isInstructor, authedHandler(deleteSubSection, "deleteSubSection"))
// Add a Sub Section to a Section
router.post("/addSubSection", auth, isInstructor, authedHandler(createSubSection, "createSubSection"))
// Signed params for a direct browser-to-Cloudinary video upload
router.post("/videoUploadSignature", auth, isInstructor, getVideoUploadSignature)
// Lecture resource attachments
router.post("/addAttachment", auth, isInstructor, authedHandler(addAttachment, "addAttachment"))
router.post("/removeAttachment", auth, isInstructor, authedHandler(removeAttachment, "removeAttachment"))
// Get all Courses Under a Specific Instructor
router.get("/getInstructorCourses", auth, isInstructor, authedHandler(getInstructorCourses, "getInstructorCourses"))
// Get all Registered Courses
router.get("/getAllCourses", getAllCourses)
// Full-text style search across published courses
router.get("/searchCourses", searchCourses)
// Get Details for a Specific Courses
router.post("/getCourseDetails", getCourseDetails)
// Get Details for a Specific Courses
router.post("/getFullCourseDetails", auth, authedHandler(getFullCourseDetails, "getFullCourseDetails"))
// To Update Course Progress
router.post("/updateCourseProgress", auth, isStudent, authedHandler(updateCourseProgress, "updateCourseProgress"))
// Heartbeat from the player — records watch position, not just done/not-done
router.post("/updateWatchPosition", auth, isStudent, authedHandler(updateWatchPosition, "updateWatchPosition"))
// To get Course Progress
router.post("/getProgressPercentage", auth, isStudent, authedHandler(getProgressPercentage, "getProgressPercentage"))
// Delete a Course
router.delete("/deleteCourse", auth, isInstructor, authedHandler(deleteCourse, "deleteCourse"))
// Duplicate a Course as a new Draft
router.post("/duplicateCourse", auth, isInstructor, authedHandler(duplicateCourse, "duplicateCourse"))

// ********************************************************************************************************
//                                      Category routes (Only by Admin)
// ********************************************************************************************************
// Category can Only be Created by Admin
// TODO: Put IsAdmin Middleware here
router.post("/createCategory", auth, isAdmin, createCategory)
router.get("/showAllCategories", showAllCategories)
router.post("/getCategoryPageDetails", categoryPageDetails)

// ********************************************************************************************************
//                                      Rating and Review
// ********************************************************************************************************
router.post("/createRating", auth, isStudent, authedHandler(createRating, "createRating"))
router.get("/getReviews", getAllRatingReview)
export default router