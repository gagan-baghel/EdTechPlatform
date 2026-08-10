const express = require("express")
const router = express.Router()

const { scheduleSession, listSessionsForCourse, cancelSession } = require("../controllers/LiveSession")
const { auth, isInstructor } = require("../middlewares/auth")

router.post("/", auth, isInstructor, scheduleSession)
router.get("/course/:courseId", auth, listSessionsForCourse)
router.patch("/:sessionId/cancel", auth, isInstructor, cancelSession)

module.exports = router
