// Import the required modules
const express = require("express")
const router = express.Router()

// Import the Controllers

// Course Controllers Import
const {
  createCourse,
  getAllCourses,
  getCourseDetails,
  getFullCourseDetails,
  editCourse,
  getInstructorCourses,
  deleteCourse,
  searchCourses,
  duplicateCourse,
} = require("../controllers/Course")

// Tags Controllers Import

// Categories Controllers Import
const {
  showAllCategories,
  createCategory,
  categoryPageDetails,
} = require("../controllers/Category")

// Sections Controllers Import
const {
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
} = require("../controllers/Section")

// Sub-Sections Controllers Import
const {
  createSubSection,
  updateSubSection,
  deleteSubSection,
  getVideoUploadSignature,
  reorderSubSections,
  addAttachment,
  removeAttachment,
} = require("../controllers/Subsection")

// Rating Controllers Import
const {
  createRating,
  getAllRatingReview,
} = require("../controllers/RatingAndReview")
const {
  updateCourseProgress,
  getProgressPercentage,
  updateWatchPosition,
} = require("../controllers/courseProgress")
// Importing Middlewares
const { auth, isInstructor, isStudent, isAdmin } = require("../middlewares/auth")

// ********************************************************************************************************
//                                      Course routes
// ********************************************************************************************************

// Courses can Only be Created by Instructors
router.post("/createCourse", auth, isInstructor, createCourse)
// Edit Course routes
router.post("/editCourse", auth, isInstructor, editCourse)
//Add a Section to a Course
router.post("/addSection", auth, isInstructor, createSection)
// Update a Section
router.post("/updateSection", auth, isInstructor, updateSection)
// Delete a Section
router.post("/deleteSection", auth, isInstructor, deleteSection)
// Persist a new section order (drag-drop curriculum builder, P2)
router.post("/reorderSections", auth, isInstructor, reorderSections)
// Persist a new lecture order within a section
router.post("/reorderSubSections", auth, isInstructor, reorderSubSections)
// Edit Sub Section
router.post("/updateSubSection", auth, isInstructor, updateSubSection)
// Delete Sub Section
router.post("/deleteSubSection", auth, isInstructor, deleteSubSection)
// Add a Sub Section to a Section
router.post("/addSubSection", auth, isInstructor, createSubSection)
// Signed params for a direct browser-to-Cloudinary video upload
router.post("/videoUploadSignature", auth, isInstructor, getVideoUploadSignature)
// Lecture resource attachments
router.post("/addAttachment", auth, isInstructor, addAttachment)
router.post("/removeAttachment", auth, isInstructor, removeAttachment)
// Get all Courses Under a Specific Instructor
router.get("/getInstructorCourses", auth, isInstructor, getInstructorCourses)
// Get all Registered Courses
router.get("/getAllCourses", getAllCourses)
// Full-text style search across published courses
router.get("/searchCourses", searchCourses)
// Get Details for a Specific Courses
router.post("/getCourseDetails", getCourseDetails)
// Get Details for a Specific Courses
router.post("/getFullCourseDetails", auth, getFullCourseDetails)
// To Update Course Progress
router.post("/updateCourseProgress", auth, isStudent, updateCourseProgress)
// Heartbeat from the player — records watch position, not just done/not-done
router.post("/updateWatchPosition", auth, isStudent, updateWatchPosition)
// To get Course Progress
router.post("/getProgressPercentage", auth, isStudent, getProgressPercentage)
// Delete a Course
router.delete("/deleteCourse", auth, isInstructor, deleteCourse)
// Duplicate a Course as a new Draft
router.post("/duplicateCourse", auth, isInstructor, duplicateCourse)

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
router.post("/createRating", auth, isStudent, createRating)
router.get("/getReviews", getAllRatingReview)

module.exports = router
