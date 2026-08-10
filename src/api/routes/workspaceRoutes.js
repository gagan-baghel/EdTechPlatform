const express = require("express")
const router = express.Router()

const {
  saveCourse,
  unsaveCourse,
  createNote,
  deleteNote,
  getNotesForCourse,
  getWorkspace,
} = require("../controllers/Workspace")
const { auth, isStudent } = require("../middlewares/auth")

router.get("/", auth, isStudent, getWorkspace)
router.post("/saved-courses", auth, isStudent, saveCourse)
router.delete("/saved-courses", auth, isStudent, unsaveCourse)
router.post("/notes", auth, isStudent, createNote)
router.delete("/notes/:noteId", auth, isStudent, deleteNote)
router.get("/notes/course/:courseId", auth, isStudent, getNotesForCourse)

module.exports = router
