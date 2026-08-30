import { z } from "zod"
import { containsId } from "../lib/ids"
import { fail, parseOrThrow } from "../lib/respond"
import { httpsUrl, objectId, text } from "../lib/schemas"
import type { Response } from "express"
import type { AuthedRequest } from "../lib/http"
import LiveSession from "../models/LiveSession"
import Course from "../models/Course"
import User from "../models/User"
import { notify } from "../utils/notify"
import { verifyUploadedVideo } from "./Subsection"

/**
 * Meeting links are handed to every enrolled student, so an unvalidated,
 * arbitrary URL here is a phishing page delivered with the course's
 * credibility behind it. Restricted to the video-conferencing hosts the
 * product actually supports — add to this list rather than removing it.
 */
const MEETING_HOSTS = [
  "zoom.us",
  "meet.google.com",
  "teams.microsoft.com",
  "teams.live.com",
  "whereby.com",
  "meet.jit.si",
] as const

const ScheduleSessionSchema = z.object({
  courseId: objectId("A valid course id is required"),
  title: text({ max: 200, label: "Title" }),
  description: text({ min: 0, max: 2000, label: "Description" }).optional().default(""),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(5).max(24 * 60).optional().default(60),
  meetingUrl: httpsUrl(MEETING_HOSTS),
})

const SessionIdSchema = z.object({
  sessionId: objectId("A valid session id is required"),
})

export const scheduleSession = async (req: AuthedRequest, res: Response) => {
  try {
    const { courseId, title, description, scheduledAt, durationMinutes, meetingUrl } =
      parseOrThrow(ScheduleSessionSchema, req.body)

    const course = await Course.findOne({ _id: courseId, instructor: req.user.id })
    if (!course) {
      return res.status(403).json({ success: false, message: "Not authorized for this course" })
    }

    const session = await LiveSession.create({
      course: courseId,
      instructor: req.user.id,
      title,
      description,
      scheduledAt,
      durationMinutes,
      meetingUrl,
    })

    // Notified in the background, not inline.
    //
    // This was an `await` inside a loop over every enrolled student, each
    // sending an email. On a course with a few thousand students that is
    // thousands of sequential SMTP round-trips inside one request, which
    // exceeds the function's 60s ceiling long before it finishes — the
    // instructor sees a timeout, the session IS created, and most students
    // are never told. Responding first and fanning out afterwards is what
    // makes the outcome the same regardless of class size.
    void notifyEnrolledStudents(course, session.scheduledAt, title, courseId)

    return res.status(201).json({ success: true, data: session })
  } catch (error) {
    return fail(res, error, "scheduleSession", "Could not schedule session")
  }
}

/**
 * Fan-out for a scheduled session. Failures are logged, never thrown: the
 * session already exists, and a notification problem must not read to the
 * instructor as "scheduling failed".
 */
async function notifyEnrolledStudents(
  course: { studentsEnrolled: unknown[]; courseName: string },
  scheduledAt: Date,
  title: string,
  courseId: string
) {
  const NOTIFY_BATCH = 25
  const students = course.studentsEnrolled ?? []

  for (let i = 0; i < students.length; i += NOTIFY_BATCH) {
    const batch = students.slice(i, i + NOTIFY_BATCH)
    const results = await Promise.allSettled(
      batch.map((studentId) =>
        notify(studentId as never, {
          type: "live_session_scheduled",
          title: `Live session scheduled: ${title}`,
          body: `${course.courseName} — ${scheduledAt.toISOString()}`,
          link: `/view-course/${courseId}`,
        })
      )
    )
    const failed = results.filter((r) => r.status === "rejected").length
    if (failed > 0) {
      console.error(
        JSON.stringify({
          event: "live_session_notify_failed",
          courseId,
          failed,
          batchSize: batch.length,
        })
      )
    }
  }
}

export const listSessionsForCourse = async (req: AuthedRequest, res: Response) => {
  try {
    const { courseId } = parseOrThrow(
      z.object({ courseId: objectId("A valid course id is required") }),
      req.params
    )
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
      .limit(100)
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
    const { sessionId } = parseOrThrow(SessionIdSchema, req.params)
    const { videoPublicId } = parseOrThrow(
      z.object({ videoPublicId: text({ max: 300, label: "Recording" }) }),
      req.body
    )

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
    return fail(res, error, "uploadRecording", "Could not attach recording")
  }
}

export const cancelSession = async (req: AuthedRequest, res: Response) => {
  try {
    const { sessionId } = parseOrThrow(SessionIdSchema, req.params)
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
