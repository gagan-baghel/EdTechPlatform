const express = require("express")
const router = express.Router()

const {
  createQuiz,
  updateQuiz,
  deleteQuiz,
  listQuizzesForCourseInstructor,
  listQuizzesForCourseStudent,
  getQuizForStudent,
  submitQuizAttempt,
  listMyAttempts,
} = require("../controllers/Quiz")

const { auth, isInstructor, isStudent } = require("../middlewares/auth")

router.post("/", auth, isInstructor, createQuiz)
router.patch("/:quizId", auth, isInstructor, updateQuiz)
router.delete("/:quizId", auth, isInstructor, deleteQuiz)
router.get("/course/:courseId/instructor", auth, isInstructor, listQuizzesForCourseInstructor)

router.get("/course/:courseId/student", auth, isStudent, listQuizzesForCourseStudent)
router.get("/:quizId", auth, isStudent, getQuizForStudent)
router.post("/:quizId/attempts", auth, isStudent, submitQuizAttempt)
router.get("/:quizId/attempts/mine", auth, isStudent, listMyAttempts)

module.exports = router
