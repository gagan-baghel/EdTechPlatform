const User = require("../models/User")
const Course = require("../models/Course")
const CourseProgress = require("../models/CourseProgress")
const Note = require("../models/Note")
const Certificate = require("../models/Certificate")
const Event = require("../models/Event")

const STREAK_WINDOW_DAYS = 30

exports.saveCourse = async (req, res) => {
  try {
    const { courseId } = req.body
    if (!courseId) {
      return res.status(400).json({ success: false, message: "courseId is required" })
    }
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { savedCourses: courseId } })
    return res.status(200).json({ success: true, message: "Course saved" })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not save course" })
  }
}

exports.unsaveCourse = async (req, res) => {
  try {
    const { courseId } = req.body
    await User.findByIdAndUpdate(req.user.id, { $pull: { savedCourses: courseId } })
    return res.status(200).json({ success: true, message: "Course removed from saved" })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not remove saved course" })
  }
}

exports.createNote = async (req, res) => {
  try {
    const { courseId, subSectionId, timestampSeconds, text } = req.body
    if (!courseId || !subSectionId || timestampSeconds === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "courseId, subSectionId and timestampSeconds are required" })
    }

    const user = await User.findById(req.user.id).select("courses")
    if (!user?.courses?.some((id) => id.toString() === courseId)) {
      return res.status(403).json({ success: false, message: "You are not enrolled in this course" })
    }

    const note = await Note.create({
      user: req.user.id,
      course: courseId,
      subSection: subSectionId,
      timestampSeconds: Number(timestampSeconds),
      text: text || "",
    })

    return res.status(201).json({ success: true, data: note })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not create note" })
  }
}

exports.deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params
    const result = await Note.findOneAndDelete({ _id: noteId, user: req.user.id })
    if (!result) {
      return res.status(404).json({ success: false, message: "Note not found" })
    }
    return res.status(200).json({ success: true, message: "Note deleted" })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not delete note" })
  }
}

exports.getNotesForCourse = async (req, res) => {
  try {
    const { courseId } = req.params
    const notes = await Note.find({ user: req.user.id, course: courseId })
      .sort({ subSection: 1, timestampSeconds: 1 })
      .lean()
    return res.status(200).json({ success: true, data: notes })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load notes" })
  }
}

/**
 * Distinct calendar days (UTC) with at least one lecture_progressed or
 * lecture_completed event in the last STREAK_WINDOW_DAYS, counted back
 * consecutively from today. Derived from the existing Event stream rather
 * than a separately-maintained counter — one write path, not two.
 */
async function computeStreak(userId) {
  const since = new Date(Date.now() - STREAK_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const events = await Event.find({
    actor: userId,
    verb: { $in: ["lecture_progressed", "lecture_completed"] },
    timestamp: { $gte: since },
  })
    .select("timestamp")
    .lean()

  const activeDays = new Set(events.map((e) => e.timestamp.toISOString().slice(0, 10)))

  let streak = 0
  const cursor = new Date()
  while (true) {
    const key = cursor.toISOString().slice(0, 10)
    if (!activeDays.has(key)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

exports.getWorkspace = async (req, res) => {
  try {
    const userId = req.user.id

    const user = await User.findById(userId)
      .populate("savedCourses", "courseName thumbnail price")
      .select("courses savedCourses")
      .lean()

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    // Continue learning: enrolled courses ordered by most recent activity.
    const progresses = await CourseProgress.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate("courseID", "courseName thumbnail")
      .lean()

    const continueLearning = progresses
      .filter((p) => p.courseID)
      .map((p) => ({
        course: p.courseID,
        lastWatchedSubSection: p.lastWatchedSubSection,
        completedCount: p.completedVideos?.length || 0,
      }))

    // Recently viewed: dedupe course_viewed events by course, most recent first.
    const viewEvents = await Event.find({ actor: userId, verb: "course_viewed" })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean()

    const seen = new Set()
    const recentCourseIds = []
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
      (a, b) => recentCourseIds.indexOf(a._id.toString()) - recentCourseIds.indexOf(b._id.toString())
    )

    const certificates = await Certificate.find({ user: userId })
      .populate("course", "courseName")
      .sort({ issuedAt: -1 })
      .lean()

    const streak = await computeStreak(userId)

    const activityEvents = await Event.find({ actor: userId })
      .sort({ timestamp: -1 })
      .limit(30)
      .lean()

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
    console.error("getWorkspace failed", error)
    return res.status(500).json({ success: false, message: "Could not load your workspace" })
  }
}
