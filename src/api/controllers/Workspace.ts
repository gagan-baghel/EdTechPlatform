import { z } from "zod"
import { fail, parseOrThrow } from "../lib/respond"
import { objectId, text } from "../lib/schemas"

/** A CourseProgress row with `courseID` populated to a course summary. */
interface ProgressWithCourse {
  courseID?: { _id: unknown; courseName: string; thumbnail: string } | null
  lastWatchedSubSection?: unknown
  completedVideos?: unknown[]
}
import type { Types } from "mongoose"
import { containsId } from "../lib/ids"
import type { Response } from "express"
import type { AuthedRequest } from "../lib/http"
import User from "../models/User"
import Course from "../models/Course"
import CourseProgress from "../models/CourseProgress"
import Note from "../models/Note"
import Certificate from "../models/Certificate"
import Event from "../models/Event"

const STREAK_WINDOW_DAYS = 30

const CourseIdBodySchema = z.object({
  courseId: objectId("A valid course id is required"),
})

const CreateNoteSchema = z.object({
  courseId: objectId("A valid course id is required"),
  subSectionId: objectId("A valid lecture id is required"),
  timestampSeconds: z.coerce.number().finite().min(0),
  text: text({ min: 0, max: 5000, label: "Note" }).optional().default(""),
})

export const saveCourse = async (req: AuthedRequest, res: Response) => {
  try {
    const { courseId } = parseOrThrow(CourseIdBodySchema, req.body)

    // A saved course must exist and be visible — otherwise the wishlist fills
    // with ids that render as blanks and can never be cleaned up from the UI.
    const exists = await Course.exists({ _id: courseId, deletedAt: null })
    if (!exists) {
      return res.status(404).json({ success: false, message: "Course not found" })
    }

    await User.findByIdAndUpdate(req.user.id, { $addToSet: { savedCourses: courseId } })
    return res.status(200).json({ success: true, message: "Course saved" })
  } catch (error) {
    return fail(res, error, "saveCourse", "Could not save course")
  }
}

export const unsaveCourse = async (req: AuthedRequest, res: Response) => {
  try {
    const { courseId } = parseOrThrow(CourseIdBodySchema, req.body)
    await User.findByIdAndUpdate(req.user.id, { $pull: { savedCourses: courseId } })
    return res.status(200).json({ success: true, message: "Course removed from saved" })
  } catch (error) {
    return fail(res, error, "unsaveCourse", "Could not remove saved course")
  }
}

export const createNote = async (req: AuthedRequest, res: Response) => {
  try {
    const { courseId, subSectionId, timestampSeconds, text: body } = parseOrThrow(
      CreateNoteSchema,
      req.body
    )

    const user = await User.findById(req.user.id).select("courses")
    if (!containsId(user?.courses, courseId)) {
      return res.status(403).json({ success: false, message: "You are not enrolled in this course" })
    }

    const note = await Note.create({
      user: req.user.id,
      course: courseId,
      subSection: subSectionId,
      timestampSeconds,
      text: body,
    })

    return res.status(201).json({ success: true, data: note })
  } catch (error) {
    return fail(res, error, "createNote", "Could not create note")
  }
}

export const deleteNote = async (req: AuthedRequest, res: Response) => {
  try {
    const { noteId } = parseOrThrow(
      z.object({ noteId: objectId("A valid note id is required") }),
      req.params
    )
    const result = await Note.findOneAndDelete({ _id: noteId, user: req.user.id })
    if (!result) {
      return res.status(404).json({ success: false, message: "Note not found" })
    }
    return res.status(200).json({ success: true, message: "Note deleted" })
  } catch (error) {
    return fail(res, error, "deleteNote", "Could not delete note")
  }
}

export const getNotesForCourse = async (req: AuthedRequest, res: Response) => {
  try {
    const { courseId } = parseOrThrow(
      z.object({ courseId: objectId("A valid course id is required") }),
      req.params
    )
    const notes = await Note.find({ user: req.user.id, course: courseId })
      .sort({ subSection: 1, timestampSeconds: 1 })
      .limit(500)
      .lean()
    return res.status(200).json({ success: true, data: notes })
  } catch (error) {
    return fail(res, error, "getNotesForCourse", "Could not load notes")
  }
}

/**
 * Distinct calendar days (UTC) with at least one lecture_progressed or
 * lecture_completed event in the last STREAK_WINDOW_DAYS, counted back
 * consecutively from today. Derived from the existing Event stream rather
 * than a separately-maintained counter — one write path, not two.
 */
async function computeStreak(userId: Types.ObjectId | string) {
  const since = new Date(Date.now() - STREAK_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const events = await Event.find({
    actor: userId,
    verb: { $in: ["lecture_progressed", "lecture_completed"] },
    timestamp: { $gte: since },
  })
    .select("timestamp")
    .lean()

  const activeDays = new Set(
    events.map((e: { timestamp: Date }) => e.timestamp.toISOString().slice(0, 10))
  )

  // Days are keyed by UTC date (`toISOString`), so the cursor has to step in
  // UTC too. `setDate` moves the LOCAL date, which in any non-UTC timezone
  // drifts off by a day partway down the streak and silently truncates it.
  let streak = 0
  let cursor = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000
  while (activeDays.has(new Date(cursor).toISOString().slice(0, 10))) {
    streak += 1
    cursor -= DAY_MS
  }
  return streak
}

export const getWorkspace = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user.id

    // Independent reads, so they run together rather than in a six-deep
    // sequential chain — this endpoint backs the dashboard's first paint.
    const [user, progresses, viewEvents, certificates, activityEvents] = await Promise.all([
      User.findById(userId)
        .populate("savedCourses", "courseName thumbnail price")
        .select("courses savedCourses")
        .lean(),
      CourseProgress.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .populate("courseID", "courseName thumbnail")
        .lean(),
      Event.find({ actor: userId, verb: "course_viewed" })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean(),
      Certificate.find({ user: userId })
        .populate("course", "courseName")
        .sort({ issuedAt: -1 })
        .limit(100)
        .lean(),
      Event.find({ actor: userId }).sort({ timestamp: -1 }).limit(30).lean(),
    ])

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    const continueLearning = progresses
      .filter((p: ProgressWithCourse) => p.courseID)
      .map((p: ProgressWithCourse) => ({
        course: p.courseID,
        lastWatchedSubSection: p.lastWatchedSubSection,
        completedCount: p.completedVideos?.length || 0,
      }))

    // Recently viewed: dedupe course_viewed events by course, most recent first.
    const seen = new Set()
    const recentCourseIds: string[] = []
    for (const event of viewEvents) {
      const id = event.object?.id?.toString()
      if (id && !seen.has(id)) {
        seen.add(id)
        recentCourseIds.push(id)
      }
      if (recentCourseIds.length >= 8) break
    }
    const recentlyViewed = await Course.find({ _id: { $in: recentCourseIds } })
      .select("courseName thumbnail price")
      .lean()
    // Re-sort to match the recency order — $in doesn't preserve it.
    recentlyViewed.sort(
      (a: { _id: unknown }, b: { _id: unknown }) =>
        recentCourseIds.indexOf(String(a._id)) - recentCourseIds.indexOf(String(b._id))
    )

    const streak = await computeStreak(userId)

    return res.status(200).json({
      success: true,
      data: {
        continueLearning,
        recentlyViewed,
        savedCourses: user.savedCourses,
        certificates,
        streak,
        recentActivity: activityEvents,
      },
    })
  } catch (error) {
    return fail(res, error, "getWorkspace", "Could not load your workspace")
  }
}
