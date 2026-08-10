const LiveSession = require("../models/LiveSession")
const Course = require("../models/Course")
const User = require("../models/User")
const { notify } = require("../utils/notify")

exports.scheduleSession = async (req, res) => {
  try {
    const { courseId, title, description, scheduledAt, durationMinutes, meetingUrl } = req.body
    if (!courseId || !title || !scheduledAt || !meetingUrl) {
      return res.status(400).json({ success: false, message: "courseId, title, scheduledAt and meetingUrl are required" })
    }

    const course = await Course.findOne({ _id: courseId, instructor: req.user.id })
    if (!course) {
      return res.status(403).json({ success: false, message: "Not authorized for this course" })
    }

    const session = await LiveSession.create({
      course: courseId,
      instructor: req.user.id,
      title,
      description: description || "",
      scheduledAt: new Date(scheduledAt),
      durationMinutes: durationMinutes || 60,
      meetingUrl,
    })

    // Notify every enrolled student — a live session is time-sensitive in
    // a way a passive course update isn't.
    for (const studentId of course.studentsEnrolled) {
      await notify(studentId, {
        type: "live_session_scheduled",
        title: `Live session scheduled: ${title}`,
        body: `${course.courseName} — ${new Date(scheduledAt).toLocaleString()}`,
        link: `/view-course/${courseId}`,
      })
    }

    return res.status(201).json({ success: true, data: session })
  } catch (error) {
    console.error("scheduleSession failed", error)
    return res.status(500).json({ success: false, message: "Could not schedule session" })
  }
}

exports.listSessionsForCourse = async (req, res) => {
  try {
    const { courseId } = req.params
    const user = await User.findById(req.user.id).select("courses")
    const isEnrolled = user?.courses?.some((id) => id.toString() === courseId)
    const course = await Course.findById(courseId).select("instructor")
    const isInstructor = course?.instructor?.toString() === req.user.id

    if (!isEnrolled && !isInstructor) {
      return res.status(403).json({ success: false, message: "Not authorized" })
    }

    const sessions = await LiveSession.find({ course: courseId, status: "scheduled" })
      .sort({ scheduledAt: 1 })
      .lean()
    return res.status(200).json({ success: true, data: sessions })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load sessions" })
  }
}

exports.cancelSession = async (req, res) => {
  try {
    const { sessionId } = req.params
    const session = await LiveSession.findOneAndUpdate(
      { _id: sessionId, instructor: req.user.id },
      { status: "cancelled" },
      { new: true }
    )
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" })
    }
    return res.status(200).json({ success: true, data: session })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not cancel session" })
  }
}
