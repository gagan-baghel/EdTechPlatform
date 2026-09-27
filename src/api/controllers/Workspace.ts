import { z } from "zod"
import mongoose, { type Types } from "mongoose"
import { fail, parseOrThrow } from "../lib/respond"
import { objectId, text } from "../lib/schemas"
import { containsId } from "../lib/ids"
import { courseScore, dayKeys, letterGrade, rankOf, sinceDays, zeroFill } from "../lib/analytics"
import type { Response } from "express"
import type { AuthedRequest } from "../lib/http"
import User from "../models/User"
import Course from "../models/Course"
import CourseProgress from "../models/CourseProgress"
import Note from "../models/Note"
import Certificate from "../models/Certificate"
import Event from "../models/Event"
import Quiz from "../models/Quiz"
import QuizAttempt from "../models/QuizAttempt"
import { EVENT_VERBS } from "../utils/emitEvent"

const STREAK_WINDOW_DAYS = 30

/**
 * The player sends one watch heartbeat per 5s of playback
 * (HEARTBEAT_INTERVAL_MS in VideoDetails.tsx), and only while the video is
 * actually playing — so heartbeats x 5s is time spent watching.
 * ponytail: approximate (seeking also fires a heartbeat); store real watch
 * seconds on the heartbeat if the weekly goal ever needs to be exact.
 */
const SECONDS_PER_HEARTBEAT = 5

/** Sections as the workspace reads them: just enough to count and locate lectures. */
interface SectionLectures {
  _id: Types.ObjectId
  subSection: Types.ObjectId[]
}

/** A CourseProgress row with `courseID` populated to a course summary and its sections. */
interface ProgressWithCourse {
  courseID: { _id: Types.ObjectId; courseName: string; thumbnail: string; courseContent: SectionLectures[] } | null
  lastWatchedSubSection?: Types.ObjectId | null
  completedVideos?: unknown[]
}

const lectureCount = (sections: readonly SectionLectures[] | undefined) =>
  (sections ?? []).reduce((sum, section) => sum + (section.subSection?.length ?? 0), 0)

const progressPercent = (done: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((done / total) * 10000) / 100) : 0

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
 * One pass over the last STREAK_WINDOW_DAYS of learning events gives the
 * streak, the daily activity chart and the minutes toward the weekly goal.
 * Derived from the existing Event stream rather than separately-maintained
 * counters — one write path, not three.
 *
 * Days are UTC, matching `$dateToString`'s default.
 */
async function computeActivity(userId: string) {
  const rows = await Event.aggregate<{ _id: string; completed: number; progressed: number; heartbeats: number }>([
    {
      $match: {
        actor: new mongoose.Types.ObjectId(userId),
        verb: { $in: [EVENT_VERBS.LECTURE_STARTED, EVENT_VERBS.LECTURE_PROGRESSED, EVENT_VERBS.LECTURE_COMPLETED] },
        timestamp: { $gte: sinceDays(STREAK_WINDOW_DAYS) },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        completed: { $sum: { $cond: [{ $eq: ["$verb", EVENT_VERBS.LECTURE_COMPLETED] }, 1, 0] } },
        progressed: { $sum: { $cond: [{ $eq: ["$verb", EVENT_VERBS.LECTURE_PROGRESSED] }, 1, 0] } },
        heartbeats: { $sum: { $cond: [{ $eq: ["$verb", EVENT_VERBS.LECTURE_COMPLETED] }, 0, 1] } },
      },
    },
  ])

  const days = zeroFill(dayKeys(STREAK_WINDOW_DAYS), rows, (row, date) => ({
    date,
    lecturesCompleted: row?.completed ?? 0,
    heartbeats: row?.heartbeats ?? 0,
    // Same definition the streak has always used: progressed or completed.
    active: (row?.progressed ?? 0) + (row?.completed ?? 0) > 0,
  }))

  let streak = 0
  for (let i = days.length - 1; i >= 0 && days[i]!.active; i -= 1) streak += 1

  const toMinutes = (heartbeats: number) => Math.round((heartbeats * SECONDS_PER_HEARTBEAT) / 60)
  const minutesLast7Days = toMinutes(days.slice(-7).reduce((sum, day) => sum + day.heartbeats, 0))

  return {
    streak,
    minutesLast7Days,
    activityByDay: days.map((day) => ({
      date: day.date,
      lecturesCompleted: day.lecturesCompleted,
      minutes: toMinutes(day.heartbeats),
    })),
  }
}

export const getWorkspace = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user.id

    // Independent reads, so they run together rather than in a six-deep
    // sequential chain — this endpoint backs the dashboard's first paint.
    const [user, progresses, viewEvents, certificates, activityEvents, activity] = await Promise.all([
      User.findById(userId)
        .populate("savedCourses", "courseName thumbnail price")
        .populate("additionalDetails", "weeklyGoalMinutes")
        .select("courses savedCourses additionalDetails")
        .lean(),
      CourseProgress.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .populate({
          path: "courseID",
          select: "courseName thumbnail courseContent",
          populate: { path: "courseContent", select: "subSection", options: { sort: { order: 1 } } },
        })
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
      computeActivity(userId),
    ])

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    const continueLearning = (progresses as ProgressWithCourse[]).flatMap((p) => {
      if (!p.courseID) return []
      const { courseContent, ...course } = p.courseID
      const total = lectureCount(courseContent)
      const completedCount = p.completedVideos?.length || 0
      // The lecture to reopen: the last one watched, else the very first.
      // "Continue" used to open the course's sales page instead of the player.
      const last = p.lastWatchedSubSection ? String(p.lastWatchedSubSection) : null
      const section =
        (last && courseContent.find((s) => containsId(s.subSection, last))) ||
        courseContent.find((s) => s.subSection?.length)
      const subSectionId = last && section && containsId(section.subSection, last) ? last : section?.subSection[0]
      return [{
        course,
        lastWatchedSubSection: p.lastWatchedSubSection,
        completedCount,
        totalLectures: total,
        progressPercent: progressPercent(completedCount, total),
        resume: section && subSectionId ? { sectionId: section._id, subSectionId } : null,
      }]
    })

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

    return res.status(200).json({
      success: true,
      data: {
        continueLearning,
        recentlyViewed,
        savedCourses: user.savedCourses,
        certificates,
        streak: activity.streak,
        activityByDay: activity.activityByDay,
        weeklyGoal: {
          goalMinutes: user.additionalDetails?.weeklyGoalMinutes ?? 0,
          minutesLast7Days: activity.minutesLast7Days,
        },
        recentActivity: activityEvents,
      },
    })
  } catch (error) {
    return fail(res, error, "getWorkspace", "Could not load your workspace")
  }
}

/* ------------------------------------------------------------------ *
 * Scorecard — every result a student has, in one place
 * ------------------------------------------------------------------ */

interface ScorecardCourse {
  _id: Types.ObjectId
  courseName: string
  thumbnail: string
  studentsEnrolled: Types.ObjectId[]
  instructor: { firstName: string; lastName: string } | null
  courseContent: SectionLectures[]
}

interface ScorecardQuiz {
  _id: Types.ObjectId
  course: Types.ObjectId
  subSection: Types.ObjectId | null
  title: string
  passingScorePercent: number
}

interface BestAttemptRow {
  _id: { quiz: Types.ObjectId; user: Types.ObjectId }
  best: number
  attempts: number
  passed: boolean
}

interface ClassmateRow {
  _id: Types.ObjectId
  firstName: string
  lastName: string
  additionalDetails: { showOnLeaderboard?: boolean } | null
}

const LEADERBOARD_SIZE = 5

/**
 * The student's scorecard across every enrolled course: lectures, every quiz's
 * best score, a course score and grade, their position in the class, and the
 * certificate if earned.
 *
 * Position needs the whole class's numbers, so this reads every classmate's
 * progress and best attempts — as two aggregations, not a query per student.
 * ponytail: ranks are computed on read; precompute them on a schedule if a
 * single course grows past ~50k students.
 *
 * Exported for the AI assistant, which grounds its answers in this.
 */
export async function buildScorecard(userId: string) {
  const user = await User.findById(userId).select("courses").lean()
  if (!user) return null

  const courses: ScorecardCourse[] = await Course.find({ _id: { $in: user.courses } })
    .select("courseName thumbnail studentsEnrolled instructor courseContent")
    .populate("instructor", "firstName lastName")
    .populate({ path: "courseContent", select: "subSection" })
    .lean()
  const courseIds = courses.map((course) => course._id)

  const quizzes: ScorecardQuiz[] = await Quiz.find({ course: { $in: courseIds }, published: true })
    .select("course subSection title passingScorePercent")
    .sort({ createdAt: 1 })
    .lean()
  const quizIds = quizzes.map((quiz) => quiz._id)

  const [progressRows, bestRows, myAttempts, certificates] = await Promise.all([
    CourseProgress.aggregate<{ courseID: Types.ObjectId; userId: Types.ObjectId; done: number; updatedAt?: Date }>([
      { $match: { courseID: { $in: courseIds } } },
      { $project: { courseID: 1, userId: 1, updatedAt: 1, done: { $size: { $ifNull: ["$completedVideos", []] } } } },
    ]),
    QuizAttempt.aggregate<BestAttemptRow>([
      { $match: { quiz: { $in: quizIds } } },
      {
        $group: {
          _id: { quiz: "$quiz", user: "$user" },
          best: { $max: "$scorePercent" },
          attempts: { $sum: 1 },
          passed: { $max: "$passed" },
        },
      },
    ]),
    QuizAttempt.find({ user: userId, quiz: { $in: quizIds } })
      .select("quiz scorePercent passed createdAt")
      .sort({ createdAt: 1 })
      .limit(500)
      .lean(),
    Certificate.find({ user: userId, course: { $in: courseIds } })
      .select("course certificateNumber issuedAt")
      .lean(),
  ])

  const progressByKey = new Map(progressRows.map((row) => [`${row.courseID}:${row.userId}`, row]))
  const bestByKey = new Map(bestRows.map((row) => [`${row._id.quiz}:${row._id.user}`, row]))
  const certificateByCourse = new Map(
    certificates.map((c: { course: unknown; certificateNumber: string; issuedAt: Date }) => [String(c.course), c])
  )

  const perCourse = courses.map((course) => {
    const id = String(course._id)
    const total = lectureCount(course.courseContent)
    const courseQuizzes = quizzes.filter((quiz) => String(quiz.course) === id)

    const scoreFor = (studentId: string) => {
      const done = progressByKey.get(`${id}:${studentId}`)?.done ?? 0
      const bests = courseQuizzes.map((quiz) => bestByKey.get(`${quiz._id}:${studentId}`)?.best ?? 0)
      return courseScore(progressPercent(done, total), bests)
    }

    // The class is everyone enrolled; the viewer is always in it, even if the
    // denormalised roster missed them.
    const classScores = new Map<string, number>()
    for (const studentId of [...course.studentsEnrolled.map(String), userId]) {
      classScores.set(studentId, scoreFor(studentId))
    }

    const myProgress = progressByKey.get(`${id}:${userId}`)
    const done = Math.min(myProgress?.done ?? 0, total)
    const quizResults = courseQuizzes.map((quiz) => {
      const best = bestByKey.get(`${quiz._id}:${userId}`)
      return {
        quizId: quiz._id,
        title: quiz.title,
        scope: quiz.subSection ? ("lecture" as const) : ("course" as const),
        passingScorePercent: quiz.passingScorePercent,
        bestScore: best?.best ?? null,
        attempts: best?.attempts ?? 0,
        passed: Boolean(best?.passed),
      }
    })
    const score = classScores.get(userId) ?? 0
    const certificate = certificateByCourse.get(id)

    return {
      courseId: course._id,
      courseName: course.courseName,
      thumbnail: course.thumbnail,
      instructorName: course.instructor
        ? `${course.instructor.firstName} ${course.instructor.lastName}`
        : null,
      lectures: { completed: done, total },
      progressPercent: progressPercent(done, total),
      quizzes: quizResults,
      quizAverage: quizResults.length
        ? Math.round(quizResults.reduce((sum, q) => sum + (q.bestScore ?? 0), 0) / quizResults.length)
        : null,
      score,
      grade: letterGrade(score),
      rank: rankOf(userId, classScores),
      classScores,
      certificate: certificate
        ? { certificateNumber: certificate.certificateNumber, issuedAt: certificate.issuedAt }
        : null,
      lastActiveAt: myProgress?.updatedAt ?? null,
    }
  })

  // Names only for the few who could appear on a leaderboard, fetched once.
  const leaderIds = new Set<string>()
  for (const course of perCourse) {
    ;[...course.classScores]
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, LEADERBOARD_SIZE * 3)
      .forEach(([id]) => leaderIds.add(id))
  }
  const classmates: ClassmateRow[] = await User.find({ _id: { $in: [...leaderIds] } })
    .select("firstName lastName additionalDetails")
    .populate("additionalDetails", "showOnLeaderboard")
    .lean()
  const classmateById = new Map(classmates.map((c) => [String(c._id), c]))

  const coursesOut = perCourse
    .map(({ classScores, ...course }) => ({
      ...course,
      leaderboard: [...classScores]
        .filter(([id, score]) => {
          if (score <= 0) return false
          if (id === userId) return true
          return classmateById.get(id)?.additionalDetails?.showOnLeaderboard !== false
        })
        .sort((a, b) => b[1] - a[1])
        .slice(0, LEADERBOARD_SIZE)
        .map(([id, score]) => {
          const person = classmateById.get(id)
          return {
            name: id === userId ? "You" : person ? `${person.firstName} ${person.lastName.charAt(0)}.` : "Student",
            score,
            position: rankOf(id, classScores).position,
            isYou: id === userId,
          }
        }),
    }))
    .sort((a, b) => (b.lastActiveAt?.getTime() ?? 0) - (a.lastActiveAt?.getTime() ?? 0))

  const quizTitle = new Map(quizzes.map((quiz) => [String(quiz._id), quiz]))
  const courseName = new Map(courses.map((course) => [String(course._id), course.courseName]))
  const attempted = coursesOut.flatMap((c) => c.quizzes).filter((q) => q.bestScore !== null)
  const average = (values: number[]) =>
    values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null
  const overallScore = average(coursesOut.map((c) => c.score)) ?? 0

  return {
    summary: {
      courses: coursesOut.length,
      certificates: certificates.length,
      lecturesCompleted: coursesOut.reduce((sum, c) => sum + c.lectures.completed, 0),
      averageProgress: average(coursesOut.map((c) => c.progressPercent)) ?? 0,
      quizzesTaken: attempted.length,
      quizzesPassed: attempted.filter((q) => q.passed).length,
      averageQuizScore: average(attempted.map((q) => q.bestScore ?? 0)),
      overallScore,
      grade: letterGrade(overallScore),
    },
    courses: coursesOut,
    quizHistory: myAttempts.map(
      (a: { quiz: Types.ObjectId; scorePercent: number; passed: boolean; createdAt: Date }) => {
        const quiz = quizTitle.get(String(a.quiz))
        return {
          quizId: a.quiz,
          quizTitle: quiz?.title ?? "Quiz",
          courseName: quiz ? courseName.get(String(quiz.course)) ?? "" : "",
          scorePercent: a.scorePercent,
          passed: a.passed,
          at: a.createdAt,
        }
      }
    ),
  }
}

export const getScorecard = async (req: AuthedRequest, res: Response) => {
  try {
    const scorecard = await buildScorecard(req.user.id)
    if (!scorecard) {
      return res.status(404).json({ success: false, message: "User not found" })
    }
    return res.status(200).json({ success: true, data: scorecard })
  } catch (error) {
    return fail(res, error, "getScorecard", "Could not load your scorecard")
  }
}
