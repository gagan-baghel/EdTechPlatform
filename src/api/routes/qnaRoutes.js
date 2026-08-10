const express = require("express")
const router = express.Router()

const {
  askQuestion,
  answerQuestion,
  listQuestionsForLecture,
  deleteQuestion,
} = require("../controllers/QnA")
const { auth } = require("../middlewares/auth")

router.post("/", auth, askQuestion)
router.post("/:questionId/answers", auth, answerQuestion)
router.get("/lecture/:subSectionId", auth, listQuestionsForLecture)
router.delete("/:questionId", auth, deleteQuestion)

module.exports = router
