import express from "express"
import { authedHandler } from "../lib/http"
const router = express.Router()

import {
  scheduleSession,
  listSessionsForCourse,
  cancelSession,
  uploadRecording,
} from "../controllers/LiveSession"
import { auth, isInstructor } from "../middlewares/auth"

router.post("/", auth, isInstructor, authedHandler(scheduleSession, "scheduleSession"))
router.get("/course/:courseId", auth, authedHandler(listSessionsForCourse, "listSessionsForCourse"))
router.patch("/:sessionId/cancel", auth, isInstructor, authedHandler(cancelSession, "cancelSession"))
router.post("/:sessionId/recording", auth, isInstructor, authedHandler(uploadRecording, "uploadRecording"))
export default router