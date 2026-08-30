import express from "express"
import { authedHandler } from "../lib/http"
const router = express.Router()

import {
  askQuestion,
  answerQuestion,
  listQuestionsForLecture,
  deleteQuestion,
} from "../controllers/QnA"
import { auth } from "../middlewares/auth"

router.post("/", auth, authedHandler(askQuestion, "askQuestion"))
router.post("/:questionId/answers", auth, authedHandler(answerQuestion, "answerQuestion"))
router.get("/lecture/:subSectionId", auth, authedHandler(listQuestionsForLecture, "listQuestionsForLecture"))
router.delete("/:questionId", auth, authedHandler(deleteQuestion, "deleteQuestion"))
export default router