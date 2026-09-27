import express from "express"
import { authedHandler } from "../lib/http"
const router = express.Router()

import {
  saveCourse,
  unsaveCourse,
  createNote,
  deleteNote,
  getNotesForCourse,
  getWorkspace,
  getScorecard,
} from "../controllers/Workspace"
import { auth, isStudent } from "../middlewares/auth"

router.get("/", auth, isStudent, authedHandler(getWorkspace, "getWorkspace"))
router.get("/scorecard", auth, isStudent, authedHandler(getScorecard, "getScorecard"))
router.post("/saved-courses", auth, isStudent, authedHandler(saveCourse, "saveCourse"))
router.delete("/saved-courses", auth, isStudent, authedHandler(unsaveCourse, "unsaveCourse"))
router.post("/notes", auth, isStudent, authedHandler(createNote, "createNote"))
router.delete("/notes/:noteId", auth, isStudent, authedHandler(deleteNote, "deleteNote"))
router.get("/notes/course/:courseId", auth, isStudent, authedHandler(getNotesForCourse, "getNotesForCourse"))
export default router