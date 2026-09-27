import express from "express"
import { authedHandler } from "../lib/http"
const router = express.Router()

import {
  createQuiz,
  updateQuiz,
  deleteQuiz,
  listQuizzesForCourseInstructor,
  listQuizzesForCourseStudent,
  getQuizForStudent,
  submitQuizAttempt,
  listMyAttempts,
  getMyQuizReview,
} from "../controllers/Quiz"
import { auth, isInstructor, isStudent } from "../middlewares/auth"

router.post("/", auth, isInstructor, authedHandler(createQuiz, "createQuiz"))
router.patch("/:quizId", auth, isInstructor, authedHandler(updateQuiz, "updateQuiz"))
router.delete("/:quizId", auth, isInstructor, authedHandler(deleteQuiz, "deleteQuiz"))
router.get("/course/:courseId/instructor", auth, isInstructor, authedHandler(listQuizzesForCourseInstructor, "listQuizzesForCourseInstructor"))

router.get("/course/:courseId/student", auth, isStudent, authedHandler(listQuizzesForCourseStudent, "listQuizzesForCourseStudent"))
router.get("/:quizId", auth, isStudent, authedHandler(getQuizForStudent, "getQuizForStudent"))
router.post("/:quizId/attempts", auth, isStudent, authedHandler(submitQuizAttempt, "submitQuizAttempt"))
router.get("/:quizId/attempts/mine", auth, isStudent, authedHandler(listMyAttempts, "listMyAttempts"))
router.get("/:quizId/review", auth, isStudent, authedHandler(getMyQuizReview, "getMyQuizReview"))
export default router