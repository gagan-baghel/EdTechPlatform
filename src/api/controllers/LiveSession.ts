import { containsId } from "../lib/ids"
import { fail } from "../lib/respond"
import type { Response } from "express"
import type { AuthedRequest } from "../lib/http"
import LiveSession from "../models/LiveSession"
import Course from "../models/Course"
import User from "../models/User"
import { notify } from "../utils/notify"
import { verifyUploadedVideo } from "./Subsection"

export const scheduleSession = async (req: AuthedRequest, res: Response) => {
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

export const listSessionsForCourse = async (req: AuthedRequest, res: Response) => {
  try {
    const { courseId } = req.params
    const user = await User.findById(req.user.id).select("courses")
    const isEnrolled = containsId(user?.courses, courseId)
    const course = await Course.findById(courseId).select("instructor")
    const isInstructor = course?.instructor?.toString() === req.user.id

    if (!isEnrolled && !isInstructor) {
      return res.status(403).json({ success: false, message: "Not authorized" })
    }

    // Not filtered to status:"scheduled" — a session that already happened
    // stays visible (and relevant) once its recording is uploaded, so
    // excluding non-"scheduled" sessions here would hide every recording.
    // Only "cancelled" is excluded.
    const sessions = await LiveSession.find({ course: courseId, status: { $ne: "cancelled" } })
      .sort({ scheduledAt: -1 })
      .lean()
    return res.status(200).json({ success: true, data: sessions })
  } catch (error) {
    return fail(res, error, "listSessionsForCourse", "Could not load sessions")
  }
}

/**
 * Attaches a recording after the session happens. Takes a Cloudinary
 * public_id from the client (uploaded there directly, using the same
 * signed-upload flow lecture videos use — see getVideoUploadSignature in
 * Subsection.js) and re-verifies it server-side rather than trusting a
 * client-supplied URL, same principle as createSubSection.
 */
export const uploadRecording = async (req: AuthedRequest, res: Response) => {
  try {
    const { sessionId } = req.params
    const { videoPublicId } = req.body
    if (!videoPublicId) {
      return res.status(400).json({ success: false, message: "videoPublicId is required" })
    }

    const session = await LiveSession.findOne({ _id: sessionId, instructor: req.user.id })
    if (!session) {
      return res.status(403).json({ success: false, message: "Not authorized for this session" })
    }

    let resource
    try {
      resource = await verifyUploadedVideo(videoPublicId)
    } catch (error) {
    return fail(res, error, "uploadRecording", "Could not verify the uploaded recording")
  }

    session.recordingVideoUrl = resource.secure_url
    session.recordingPublicId = videoPublicId
    await session.save()

    return res.status(200).json({ success: true, data: session })
  } catch (error) {
    console.error("uploadRecording failed", error)
    return res.status(500).json({ success: false, message: "Could not attach recording" })
  }
}

export const cancelSession = async (req: AuthedRequest, res: Response) => {
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
    return fail(res, error, "cancelSession", "Could not cancel session")
  }
}
