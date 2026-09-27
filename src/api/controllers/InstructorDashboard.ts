import { z } from "zod"
import type { Types } from "mongoose"
import type { Response } from "express"

import { courseScore, dayKeys, sinceDays } from "../lib/analytics"
import type { AuthedRequest } from "../lib/http"
import { fail, parseOrThrow } from "../lib/respond"
import Certificate from "../models/Certificate"
import Course from "../models/Course"
import CourseProgress from "../models/CourseProgress"
import Payment from "../models/Payment"
import Quiz from "../models/Quiz"
import QuizAttempt from "../models/QuizAttempt"
import RatingAndReview from "../models/RatingAndReview"
import User from "../models/User"
import Event from "../models/Event"
import { EVENT_VERBS } from "../utils/emitEvent"

/**
 * The instructor's dashboard: money, enrolments, how each course is actually
 * going, which students need a nudge, and which quiz questions are failing
 * the class.
 *
 * Everything is read from data the platform already writes — Payment,
 * CourseProgress, QuizAttempt, Certificate, RatingAndReview. No new pipeline.
 * ponytail: every read is bounded (5000 payments/attempts) and aggregated on
 * request; move to a nightly rollup if an instructor outgrows those windows.
 */

/** An IANA zone the runtime (and so MongoDB's date operators) accepts. */
function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value })
    return true
  } catch {
    return false
  }
}

const RangeSchema = z.object({
  days: z.enum(["7", "30", "90"]).catch("30").transform(Number),
  // The study-time heatmap is bucketed in the viewer's own clock.
  tz: z.string().max(64).refine(isTimeZone).catch("UTC"),
})

const SECONDS_PER_HEARTBEAT = 5 // VideoDetails.tsx HEARTBEAT_INTERVAL_MS
const PROGRESS_BUCKETS = ["0%", "1–25%", "26–50%", "51–75%", "76–99%", "100%"] as const
const progressBucket = (p: number) =>
  p <= 0 ? 0 : p >= 100 ? 5 : p <= 25 ? 1 : p <= 50 ? 2 : p <= 75 ? 3 : 4

const ROSTER_LIMIT = 300
const AT_RISK_INACTIVE_DAYS = 14
const GRACE_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

export type LearnerStatus = "at_risk" | "not_started" | "on_track" | "completed"
const STATUS_ORDER: LearnerStatus[] = ["at_risk", "not_started", "on_track", "completed"]

interface DashboardCourse {
  _id: Types.ObjectId
  courseName: string
  status: string
  price: number
  studentsEnrolled: Types.ObjectId[]
  courseContent: Array<{ sectionName: string; subSection: Array<{ _id: Types.ObjectId; title: string }> }>
}

interface ProgressRow {
  courseID: Types.ObjectId
  userId: Types.ObjectId | string
  createdAt?: Date
  updatedAt?: Date
  done: number
  started: boolean
}

interface AttemptRow {
  quiz: Types.ObjectId
  user: Types.ObjectId
  scorePercent: number
  passed: boolean
  answers: Array<{ questionId: Types.ObjectId; selectedOptionIndex: number }>
}

interface QuizRow {
  _id: Types.ObjectId
  course: Types.ObjectId
  title: string
  published: boolean
  questions: Array<{ _id: Types.ObjectId; questionText: string; correctOptionIndex: number }>
}

interface PaymentRow {
  date: Date
  amount: number
  courses: Array<{ _id: Types.ObjectId; price?: number } | null>
}

/**
 * Whether a learner needs attention. Exported for the test that pins it.
 * `now` is a parameter so the boundaries can be tested without a clock.
 */
export function learnerStatus(
  row: { done: number; started: boolean; createdAt?: Date; updatedAt?: Date },
  progress: number,
  certified: boolean,
  now: number = Date.now()
): LearnerStatus {
  if (certified || progress >= 100) return "completed"
  const enrolledDays = (now - (row.createdAt?.getTime() ?? now)) / DAY_MS
  const idleDays = (now - (row.updatedAt?.getTime() ?? row.createdAt?.getTime() ?? now)) / DAY_MS
  const started = row.started || row.done > 0
  if (enrolledDays >= GRACE_DAYS && (idleDays >= AT_RISK_INACTIVE_DAYS || !started)) return "at_risk"
  return started ? "on_track" : "not_started"
}

const round = (value: number, places = 0) => {
  const f = 10 ** places
  return Math.round(value * f) / f
}
const average = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null

export const instructorDashboard = async (req: AuthedRequest, res: Response) => {
  try {
    const { days, tz } = parseOrThrow(RangeSchema, req.query)
    const since = sinceDays(days)

    const courses: DashboardCourse[] = await Course.find({ instructor: req.user.id, deletedAt: null })
      .select("courseName status price studentsEnrolled courseContent")
      .populate({
        path: "courseContent",
        select: "sectionName subSection order",
        options: { sort: { order: 1 } },
        populate: { path: "subSection", select: "title order", options: { sort: { order: 1 } } },
      })
      .lean()
    const courseIds = courses.map((c) => c._id)

    const quizzes: QuizRow[] = await Quiz.find({ course: { $in: courseIds } })
      .select("course title published questions._id questions.questionText questions.correctOptionIndex")
      .lean()

    const courseIdStrings = courseIds.map(String)
    const [payments, progressRows, ratingRows, certificates, attempts, activity, lectureCompletions] = await Promise.all([
      Payment.find({ courses: { $in: courseIds } })
        .sort({ date: -1 })
        .limit(5000)
        .populate({ path: "courses", select: "price" })
        .lean() as Promise<PaymentRow[]>,
      CourseProgress.aggregate<ProgressRow>([
        { $match: { courseID: { $in: courseIds } } },
        {
          $project: {
            courseID: 1,
            userId: 1,
            createdAt: 1,
            updatedAt: 1,
            done: { $size: { $ifNull: ["$completedVideos", []] } },
            started: { $gt: [{ $size: { $ifNull: ["$watchState", []] } }, 0] },
          },
        },
      ]),
      RatingAndReview.aggregate<{ _id: { course: Types.ObjectId; rating: number }; count: number }>([
        { $match: { course: { $in: courseIds } } },
        { $group: { _id: { course: "$course", rating: "$rating" }, count: { $sum: 1 } } },
      ]),
      Certificate.find({ course: { $in: courseIds } }).select("course user").lean() as Promise<
        Array<{ course: Types.ObjectId; user: Types.ObjectId }>
      >,
      QuizAttempt.find({ quiz: { $in: quizzes.map((q) => q._id) } })
        .select("quiz user scorePercent passed answers")
        .sort({ createdAt: -1 })
        .limit(5000)
        .lean() as Promise<AttemptRow[]>,
      // Learning activity in this instructor's courses. Progress events carry
      // the course id (as a string) in their context.
      Event.aggregate<{
        byDay: Array<{ _id: string; activeLearners: number; completed: number; heartbeats: number }>
        heatmap: Array<{ _id: { dow: number; hour: number }; heartbeats: number }>
      }>([
        {
          $match: {
            verb: { $in: [EVENT_VERBS.LECTURE_STARTED, EVENT_VERBS.LECTURE_PROGRESSED, EVENT_VERBS.LECTURE_COMPLETED] },
            timestamp: { $gte: since },
            "context.courseId": { $in: courseIdStrings },
          },
        },
        {
          $addFields: {
            isCompletion: { $eq: ["$verb", EVENT_VERBS.LECTURE_COMPLETED] },
          },
        },
        {
          $facet: {
            byDay: [
              {
                $group: {
                  _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }, actor: "$actor" },
                  completed: { $sum: { $cond: ["$isCompletion", 1, 0] } },
                  heartbeats: { $sum: { $cond: ["$isCompletion", 0, 1] } },
                },
              },
              {
                $group: {
                  _id: "$_id.day",
                  activeLearners: { $sum: 1 },
                  completed: { $sum: "$completed" },
                  heartbeats: { $sum: "$heartbeats" },
                },
              },
            ],
            heatmap: [
              { $match: { isCompletion: false } },
              {
                $group: {
                  _id: {
                    dow: { $dayOfWeek: { date: "$timestamp", timezone: tz } },
                    hour: { $hour: { date: "$timestamp", timezone: tz } },
                  },
                  heartbeats: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]),
      // How many learners have finished each lecture — the drop-off curve.
      CourseProgress.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { courseID: { $in: courseIds } } },
        { $unwind: "$completedVideos" },
        { $group: { _id: "$completedVideos", count: { $sum: 1 } } },
      ]),
    ])

    const ownCourseIds = new Set(courseIds.map(String))

    // Revenue per course and per day. A payment can cover several courses
    // but stores only its total, so each course's share is its price relative
    // to the others in that payment — same split as Payout's earnings.
    const revenueByCourse = new Map<string, number>()
    const revenueByDay = new Map<string, number>()
    for (const payment of payments) {
      const inPayment = (payment.courses ?? []).filter((c): c is { _id: Types.ObjectId; price?: number } => Boolean(c))
      const totalPrice = inPayment.reduce((sum, c) => sum + (c.price || 0), 0)
      if (totalPrice <= 0) continue
      const day = new Date(payment.date).toISOString().slice(0, 10)
      for (const course of inPayment) {
        if (!ownCourseIds.has(String(course._id))) continue
        const share = ((course.price || 0) / totalPrice) * payment.amount
        revenueByCourse.set(String(course._id), (revenueByCourse.get(String(course._id)) ?? 0) + share)
        if (payment.date >= since) revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + share)
      }
    }

    // A CourseProgress row is created exactly once, at enrolment.
    const enrollmentsByDay = new Map<string, number>()
    for (const row of progressRows) {
      if (row.createdAt && row.createdAt >= since) {
        const day = row.createdAt.toISOString().slice(0, 10)
        enrollmentsByDay.set(day, (enrollmentsByDay.get(day) ?? 0) + 1)
      }
    }

    const certified = new Set(certificates.map((c) => `${c.course}:${c.user}`))
    // Star histogram per course; the average and count derive from it.
    const starsByCourse = new Map<string, number[]>()
    for (const row of ratingRows) {
      const key = String(row._id.course)
      const stars = starsByCourse.get(key) ?? [0, 0, 0, 0, 0]
      const star = Math.min(5, Math.max(1, Math.round(row._id.rating)))
      stars[star - 1]! += row.count
      starsByCourse.set(key, stars)
    }
    const ratingByCourse = new Map(
      [...starsByCourse].map(([key, stars]) => {
        const count = stars.reduce((a, b) => a + b, 0)
        const avg = stars.reduce((sum, n, i) => sum + n * (i + 1), 0) / count
        return [key, { avg, count, stars }]
      })
    )
    const bestByKey = new Map<string, number>()
    for (const a of attempts) {
      const key = `${a.quiz}:${a.user}`
      bestByKey.set(key, Math.max(bestByKey.get(key) ?? 0, a.scorePercent))
    }

    const roster: Array<{
      userId: string
      courseId: string
      courseName: string
      progressPercent: number
      score: number
      quizAverage: number | null
      enrolledAt: Date | null
      lastActiveAt: Date | null
      status: LearnerStatus
    }> = []

    const courseStats = courses.map((course) => {
      const id = String(course._id)
      const enrolled = new Set(course.studentsEnrolled.map(String))
      const total = course.courseContent.reduce((sum, s) => sum + (s.subSection?.length ?? 0), 0)
      const completedByLecture = new Map(lectureCompletions.map((l) => [String(l._id), l.count]))
      const publishedQuizzes = quizzes.filter((q) => String(q.course) === id && q.published)
      // The roster is who is enrolled, not who has a progress row: a student
      // who never opened a lecture may have no row at all, and they are the
      // one an instructor most needs to see.
      const rowByUser = new Map(
        progressRows.filter((r) => String(r.courseID) === id).map((r) => [String(r.userId), r])
      )
      const rows = [...enrolled].map(
        (userId) => rowByUser.get(userId) ?? { courseID: course._id, userId, done: 0, started: false }
      )

      const progresses = rows.map((row) => {
        const progress = total > 0 ? Math.min(100, (row.done / total) * 100) : 0
        const bests = publishedQuizzes.map((q) => bestByKey.get(`${q._id}:${row.userId}`))
        const attemptedBests = bests.filter((b): b is number => b !== undefined)
        const isCertified = certified.has(`${id}:${row.userId}`)
        roster.push({
          userId: String(row.userId),
          courseId: id,
          courseName: course.courseName,
          progressPercent: round(progress, 1),
          score: courseScore(progress, bests.map((b) => b ?? 0)),
          quizAverage: attemptedBests.length ? round(average(attemptedBests)!) : null,
          enrolledAt: row.createdAt ?? null,
          lastActiveAt: row.updatedAt ?? null,
          status: learnerStatus(row, progress, isCertified),
        })
        return progress
      })

      const courseAttempts = attempts.filter((a) =>
        publishedQuizzes.some((q) => String(q._id) === String(a.quiz))
      )
      const rating = ratingByCourse.get(id)
      const students = enrolled.size
      const completions = [...enrolled].filter((u) => certified.has(`${id}:${u}`)).length

      return {
        _id: course._id,
        courseName: course.courseName,
        status: course.status,
        price: course.price,
        students,
        completions,
        revenue: round(revenueByCourse.get(id) ?? 0, 2),
        averageProgress: round(average(progresses) ?? 0, 1),
        completionRate: students ? round((completions / students) * 100, 1) : 0,
        averageRating: rating ? round(rating.avg, 1) : null,
        reviews: rating?.count ?? 0,
        ratingStars: rating?.stars ?? [0, 0, 0, 0, 0],
        // Share of enrolled learners who finished each lecture, in course order.
        lectureFunnel: course.courseContent.flatMap((section) =>
          (section.subSection ?? []).map((lecture) => ({
            title: lecture.title,
            section: section.sectionName,
            completedPercent: students
              ? Math.min(100, round(((completedByLecture.get(String(lecture._id)) ?? 0) / students) * 100))
              : 0,
          }))
        ),
        averageQuizScore: courseAttempts.length ? round(average(courseAttempts.map((a) => a.scorePercent))!) : null,
      }
    })

    // Quiz insights: pass rate per quiz and the questions the class gets wrong.
    const courseName = new Map(courses.map((c) => [String(c._id), c.courseName]))
    const quizInsights = quizzes
      .map((quiz) => {
        const mine = attempts.filter((a) => String(a.quiz) === String(quiz._id))
        const attempters = new Set(mine.map((a) => String(a.user)))
        const passers = new Set(mine.filter((a) => a.passed).map((a) => String(a.user)))
        const questions = quiz.questions.map((question) => {
          let answered = 0
          let correct = 0
          for (const attempt of mine) {
            const answer = attempt.answers.find((x) => String(x.questionId) === String(question._id))
            if (!answer) continue
            answered += 1
            if (answer.selectedOptionIndex === question.correctOptionIndex) correct += 1
          }
          return {
            questionText: question.questionText,
            answered,
            correctRate: answered ? round((correct / answered) * 100) : null,
          }
        })
        const scoreBuckets = Array<number>(10).fill(0)
        for (const student of attempters) {
          const best = bestByKey.get(`${quiz._id}:${student}`) ?? 0
          scoreBuckets[Math.min(9, Math.floor(best / 10))]! += 1
        }
        return {
          quizId: quiz._id,
          title: quiz.title,
          scoreDistribution: scoreBuckets,
          courseName: courseName.get(String(quiz.course)) ?? "",
          published: quiz.published,
          attempts: mine.length,
          students: attempters.size,
          passRate: attempters.size ? round((passers.size / attempters.size) * 100) : null,
          averageScore: mine.length ? round(average(mine.map((a) => a.scorePercent))!) : null,
          // Only questions someone actually got wrong count as "missed".
          hardestQuestions: questions
            .filter((q) => q.correctRate !== null && q.correctRate < 100)
            .sort((a, b) => (a.correctRate ?? 0) - (b.correctRate ?? 0))
            .slice(0, 3),
        }
      })
      .sort((a, b) => b.attempts - a.attempts)

    const emptyCounts = () => Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<LearnerStatus, number>
    const statusCounts = emptyCounts()
    const statusByCourse = new Map<string, Record<LearnerStatus, number>>()
    const progressDistribution = PROGRESS_BUCKETS.map((label) => ({ label, learners: 0 }))
    for (const learner of roster) {
      statusCounts[learner.status] += 1
      const perCourse = statusByCourse.get(learner.courseId) ?? emptyCounts()
      perCourse[learner.status] += 1
      statusByCourse.set(learner.courseId, perCourse)
      progressDistribution[progressBucket(learner.progressPercent)]!.learners += 1
    }

    const [facets] = activity
    const minutes = (heartbeats: number) => Math.round((heartbeats * SECONDS_PER_HEARTBEAT) / 60)
    const activityByDay = new Map((facets?.byDay ?? []).map((d) => [d._id, d]))
    // 7 x 24, Monday first; $dayOfWeek counts Sunday as 1.
    const studyHeatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
    for (const cell of facets?.heatmap ?? []) {
      studyHeatmap[(cell._id.dow + 5) % 7]![cell._id.hour]! += minutes(cell.heartbeats)
    }

    roster.sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
        (a.lastActiveAt?.getTime() ?? 0) - (b.lastActiveAt?.getTime() ?? 0)
    )
    const shownRoster = roster.slice(0, ROSTER_LIMIT)
    const names: Array<{ _id: Types.ObjectId; firstName: string; lastName: string }> = await User.find({
      _id: { $in: [...new Set(shownRoster.map((r) => r.userId))] },
    })
      .select("firstName lastName")
      .lean()
    const nameById = new Map(names.map((n) => [String(n._id), `${n.firstName} ${n.lastName}`]))

    const enrollments = courseStats.reduce((sum, c) => sum + c.students, 0)
    const ratedCourses = courseStats.filter((c) => c.reviews > 0)
    const reviewCount = ratedCourses.reduce((sum, c) => sum + c.reviews, 0)

    return res.status(200).json({
      success: true,
      data: {
        rangeDays: days,
        totals: {
          courses: courses.length,
          publishedCourses: courses.filter((c) => c.status === "Published").length,
          students: new Set(courses.flatMap((c) => c.studentsEnrolled.map(String))).size,
          enrollments,
          revenue: round(courseStats.reduce((sum, c) => sum + c.revenue, 0), 2),
          revenueInRange: round([...revenueByDay.values()].reduce((sum, v) => sum + v, 0), 2),
          enrollmentsInRange: [...enrollmentsByDay.values()].reduce((sum, v) => sum + v, 0),
          averageRating: reviewCount
            ? round(ratedCourses.reduce((sum, c) => sum + (c.averageRating ?? 0) * c.reviews, 0) / reviewCount, 1)
            : null,
          completionRate: enrollments
            ? round((courseStats.reduce((sum, c) => sum + c.completions, 0) / enrollments) * 100, 1)
            : 0,
          averageQuizScore: attempts.length ? round(average(attempts.map((a) => a.scorePercent))!) : null,
        },
        timeline: dayKeys(days).map((date) => ({
          date,
          revenue: round(revenueByDay.get(date) ?? 0, 2),
          enrollments: enrollmentsByDay.get(date) ?? 0,
          activeLearners: activityByDay.get(date)?.activeLearners ?? 0,
          lecturesCompleted: activityByDay.get(date)?.completed ?? 0,
          minutesWatched: minutes(activityByDay.get(date)?.heartbeats ?? 0),
        })),
        timezone: tz,
        studyHeatmap,
        progressDistribution,
        statusByCourse: courses.map((c) => ({
          courseId: c._id,
          courseName: c.courseName,
          counts: statusByCourse.get(String(c._id)) ?? emptyCounts(),
        })),
        courses: courseStats,
        learners: {
          counts: statusCounts,
          total: roster.length,
          rows: shownRoster.map((r) => ({ ...r, name: nameById.get(r.userId) ?? "Student" })),
        },
        quizzes: quizInsights,
      },
    })
  } catch (error) {
    return fail(res, error, "instructorDashboard", "Could not load your dashboard")
  }
}
