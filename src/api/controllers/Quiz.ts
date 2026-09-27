import { fail, parseOrThrow } from "../lib/respond"
import { z } from "zod"

const questionSchema = z.object({
  questionText: z.string().min(1, "questionText is required"),
  options: z.array(z.string()).min(2, "Every question needs text and at least 2 options"),
  correctOptionIndex: z.number().min(0, "correctOptionIndex must point at a real option"),
  // The schema has always had this field, but the validator stripped it, so
  // no explanation was ever stored for the result review to show.
  explanation: z.string().trim().max(2000).optional(),
}).refine(data => data.correctOptionIndex < data.options.length, {
  message: "correctOptionIndex must point at a real option",
  path: ["correctOptionIndex"]
})

const createQuizSchema = z.object({
  courseId: objectId("courseId, title and at least one question are required"),
  subSectionId: objectId().optional(),
  title: z.string().min(1, "courseId, title and at least one question are required"),
  questions: z.array(questionSchema).min(1, "courseId, title and at least one question are required"),
  passingScorePercent: z.number().optional(),
})

const updateQuizBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  // `.min(1)` matters: an empty array was accepted, and submitQuizAttempt then
  // divided by `quiz.questions.length` — scorePercent came back NaN, the
  // attempt was stored with NaN, and the pass check silently evaluated false
  // forever, permanently blocking the course's certificate.
  questions: z.array(questionSchema).min(1, "A quiz needs at least one question").optional(),
  passingScorePercent: z.coerce.number().min(0).max(100).optional(),
  published: z.boolean().optional(),
})

const submitQuizAttemptBodySchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: objectId(),
        selectedOptionIndex: z.coerce.number().int().min(0).max(50),
      })
    )
    .max(200, "Too many answers"),
})

const quizParamsSchema = z.object({ quizId: objectId("A valid quiz id is required") })
const courseParamsSchema = z.object({ courseId: objectId("A valid course id is required") })

/**
 * Attempts are capped.
 *
 * Every submission returns the score, and the answer key never changes, so
 * unlimited attempts make a quiz solvable by brute force in a handful of
 * requests — the "assessment" verifies nothing. The cap is per quiz, per user.
 */
export const MAX_ATTEMPTS_PER_QUIZ = 10

/**
 * The per-question result review — the answer key, laid against what the
 * student picked.
 *
 * Only unlocked once the student has passed or used every attempt. Showing
 * which answers were wrong on a failed attempt is a coordinate-wise search:
 * with four options, the cap above would no longer protect anything. The score
 * alone is what a still-trying student gets.
 */
interface GradableQuestion {
  _id: Types.ObjectId
  questionText: string
  options: string[]
  correctOptionIndex: number
  explanation?: string | null
}

function buildReview(
  questions: GradableQuestion[],
  answers: ReadonlyArray<{ questionId: unknown; selectedOptionIndex: number }>
) {
  const picked = new Map(answers.map((a) => [String(a.questionId), a.selectedOptionIndex]))
  return questions.map((q) => {
    const selectedOptionIndex = picked.get(q._id.toString()) ?? null
    return {
      questionId: q._id,
      questionText: q.questionText,
      options: q.options,
      selectedOptionIndex,
      correctOptionIndex: q.correctOptionIndex,
      correct: selectedOptionIndex === q.correctOptionIndex,
      explanation: q.explanation ?? null,
    }
  })
}

const reviewUnlocked = (passedEver: boolean, attemptsUsed: number) =>
  passedEver || attemptsUsed >= MAX_ATTEMPTS_PER_QUIZ

/** Projection returned by the student quiz list — see the `.lean()` above. */
interface QuizSummarySource {
  _id: Types.ObjectId
  title: string
  subSection: Types.ObjectId | null
  passingScorePercent: number
  questions: unknown[]
}

/** A quiz question as stored. `correctOptionIndex` is deliberately not read here. */
interface QuizQuestionSource {
  _id: Types.ObjectId
  questionText: string
  options: string[]
}
import type { Types } from "mongoose"
import { containsId } from "../lib/ids"
import { objectId } from "../lib/schemas"
import type { Response } from "express"
import type { AuthedRequest } from "../lib/http"
import Quiz from "../models/Quiz"
import QuizAttempt from "../models/QuizAttempt"
import Course from "../models/Course"
import User from "../models/User"
import { recordAudit } from "../utils/recordAudit"
import { emitEvent, EVENT_VERBS } from "../utils/emitEvent"

async function assertCourseOwnership(
  courseId: string,
  instructorId: Types.ObjectId | string
) {
  const course = await Course.findOne({ _id: courseId, instructor: instructorId })
  return course
}

export const createQuiz = async (req: AuthedRequest, res: Response) => {
  try {
    const { courseId, subSectionId, title, questions, passingScorePercent } = parseOrThrow(createQuizSchema, req.body)

    const course = await assertCourseOwnership(courseId, req.user.id)
    if (!course) {
      return res.status(403).json({ success: false, message: "Not authorized to add a quiz to this course" })
    }

    const quiz = await Quiz.create({
      course: courseId,
      subSection: subSectionId || null,
      title,
      questions,
      passingScorePercent: passingScorePercent ?? 70,
      createdBy: req.user.id,
      published: false,
    })

    await recordAudit({
      actor: req.user.id,
      action: "quiz.create",
      targetType: "Quiz",
      targetId: quiz._id,
      details: { courseId, title },
    })

    return res.status(201).json({ success: true, data: quiz })
  } catch (error) {
    return fail(res, error, "createQuiz", "Could not create quiz")
  }
}

export const updateQuiz = async (req: AuthedRequest, res: Response) => {
  try {
    const { quizId } = parseOrThrow(quizParamsSchema, req.params)
    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }

    const course = await assertCourseOwnership(quiz.course, req.user.id)
    if (!course) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this quiz" })
    }

    const { title, questions, passingScorePercent, published } = parseOrThrow(updateQuizBodySchema, req.body)
    if (title !== undefined) quiz.title = title
    if (questions !== undefined) quiz.questions = questions
    if (passingScorePercent !== undefined) quiz.passingScorePercent = passingScorePercent
    if (published !== undefined) quiz.published = published

    await quiz.save()

    return res.status(200).json({ success: true, data: quiz })
  } catch (error) {
    return fail(res, error, "updateQuiz", "Could not update quiz")
  }
}

export const deleteQuiz = async (req: AuthedRequest, res: Response) => {
  try {
    const { quizId } = parseOrThrow(quizParamsSchema, req.params)
    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }
    const course = await assertCourseOwnership(quiz.course, req.user.id)
    if (!course) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this quiz" })
    }
    await Quiz.findByIdAndDelete(quizId)
    await QuizAttempt.deleteMany({ quiz: quizId })
    return res.status(200).json({ success: true, message: "Quiz deleted" })
  } catch (error) {
    return fail(res, error, "deleteQuiz", "Could not delete quiz")
  }
}

// Instructor view — includes correct answers and unpublished drafts.
export const listQuizzesForCourseInstructor = async (req: AuthedRequest, res: Response) => {
  try {
    const { courseId } = parseOrThrow(courseParamsSchema, req.params)
    const course = await assertCourseOwnership(courseId, req.user.id)
    if (!course) {
      return res.status(403).json({ success: false, message: "Not authorized" })
    }
    const quizzes = await Quiz.find({ course: courseId }).lean()
    return res.status(200).json({ success: true, data: quizzes })
  } catch (error) {
    return fail(res, error, "listQuizzesForCourseInstructor", "Could not list quizzes")
  }
}

// Student-facing discovery: which quizzes exist for a course they're
// enrolled in. Titles/ids only — no questions, so this is safe to call
// before deciding to start a specific quiz.
export const listQuizzesForCourseStudent = async (req: AuthedRequest, res: Response) => {
  try {
    const { courseId } = parseOrThrow(courseParamsSchema, req.params)
    const userId = req.user.id

    const user = await User.findById(userId).select("courses")
    if (!containsId(user?.courses, courseId)) {
      return res.status(403).json({ success: false, message: "You are not enrolled in this course" })
    }

    const quizzes = await Quiz.find(
      { course: courseId, published: true },
      { title: 1, subSection: 1, passingScorePercent: 1, questions: 1 }
    ).lean()

    const summarized = quizzes.map((q: QuizSummarySource) => ({
      _id: q._id,
      title: q.title,
      subSection: q.subSection,
      passingScorePercent: q.passingScorePercent,
      questionCount: q.questions.length,
    }))

    return res.status(200).json({ success: true, data: summarized })
  } catch (error) {
    return fail(res, error, "listQuizzesForCourseStudent", "Could not list quizzes")
  }
}

// Student view — published quizzes only, correct answers stripped. The
// whole reason this is a separate endpoint from the instructor one rather
// than a query-param toggle: forgetting a toggle leaks answers, a
// separate code path structurally can't.
export const getQuizForStudent = async (req: AuthedRequest, res: Response) => {
  try {
    const { quizId } = parseOrThrow(quizParamsSchema, req.params)
    const userId = req.user.id

    const quiz = await Quiz.findOne({ _id: quizId, published: true }).lean()
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }

    const user = await User.findById(userId).select("courses")
    if (!containsId(user?.courses, quiz.course.toString())) {
      return res.status(403).json({ success: false, message: "You are not enrolled in this course" })
    }

    const sanitized = {
      ...quiz,
      questions: quiz.questions.map((q: QuizQuestionSource) => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
      })),
    }

    return res.status(200).json({ success: true, data: sanitized })
  } catch (error) {
    return fail(res, error, "getQuizForStudent", "Could not load quiz")
  }
}

export const submitQuizAttempt = async (req: AuthedRequest, res: Response) => {
  try {
    const { quizId } = parseOrThrow(quizParamsSchema, req.params)
    const { answers } = parseOrThrow(submitQuizAttemptBodySchema, req.body)
    const userId = req.user.id

    const quiz = await Quiz.findOne({ _id: quizId, published: true })
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }

    const user = await User.findById(userId).select("courses")
    if (!containsId(user?.courses, quiz.course.toString())) {
      return res.status(403).json({ success: false, message: "You are not enrolled in this course" })
    }

    const attemptCount = await QuizAttempt.countDocuments({ quiz: quizId, user: userId })
    if (attemptCount >= MAX_ATTEMPTS_PER_QUIZ) {
      return res.status(429).json({
        success: false,
        message: `You have used all ${MAX_ATTEMPTS_PER_QUIZ} attempts for this quiz.`,
      })
    }

    if (quiz.questions.length === 0) {
      return res.status(409).json({
        success: false,
        message: "This quiz has no questions yet.",
      })
    }

    // Grade server-side against the stored answer key — the client never
    // gets to say what's correct, same principle as payment amounts
    // being read from the stored Order rather than the request body.
    let correctCount = 0
    for (const question of quiz.questions) {
      const submitted = answers.find((a) => a.questionId === question._id.toString())
      if (submitted && submitted.selectedOptionIndex === question.correctOptionIndex) {
        correctCount += 1
      }
    }
    const scorePercent = Math.round((correctCount / quiz.questions.length) * 100)
    const passed = scorePercent >= quiz.passingScorePercent

    const passedBefore = !passed && Boolean(await QuizAttempt.exists({ quiz: quizId, user: userId, passed: true }))

    const attempt = await QuizAttempt.create({
      quiz: quizId,
      user: userId,
      answers: answers.map((a) => ({ questionId: a.questionId, selectedOptionIndex: a.selectedOptionIndex })),
      scorePercent,
      passed,
    })

    await emitEvent(passed ? EVENT_VERBS.QUIZ_PASSED : EVENT_VERBS.QUIZ_ATTEMPTED, {
      actor: userId,
      object: { type: "Quiz", id: quizId },
      context: { courseId: quiz.course.toString(), scorePercent, passed },
    })

    return res.status(200).json({
      success: true,
      data: {
        scorePercent,
        passed,
        passingScorePercent: quiz.passingScorePercent,
        attemptId: attempt._id,
        attemptsUsed: attemptCount + 1,
        attemptsAllowed: MAX_ATTEMPTS_PER_QUIZ,
        review: reviewUnlocked(passed || passedBefore, attemptCount + 1)
          ? buildReview(quiz.questions, answers)
          : null,
      },
    })
  } catch (error) {
    return fail(res, error, "submitQuizAttempt", "Could not submit quiz attempt")
  }
}

export const listMyAttempts = async (req: AuthedRequest, res: Response) => {
  try {
    const { quizId } = parseOrThrow(quizParamsSchema, req.params)
    const attempts = await QuizAttempt.find({ quiz: quizId, user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(MAX_ATTEMPTS_PER_QUIZ)
      .lean()
    return res.status(200).json({ success: true, data: attempts })
  } catch (error) {
    return fail(res, error, "listMyAttempts", "Could not load attempt history")
  }
}

/**
 * Re-open the result review for the student's latest attempt, under the same
 * unlock rule as the submission response.
 */
export const getMyQuizReview = async (req: AuthedRequest, res: Response) => {
  try {
    const { quizId } = parseOrThrow(quizParamsSchema, req.params)
    const userId = req.user.id

    const quiz = await Quiz.findOne({ _id: quizId, published: true }).lean()
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }

    const [latest, attemptsUsed, passedEver] = await Promise.all([
      QuizAttempt.findOne({ quiz: quizId, user: userId }).sort({ createdAt: -1 }).lean(),
      QuizAttempt.countDocuments({ quiz: quizId, user: userId }),
      QuizAttempt.exists({ quiz: quizId, user: userId, passed: true }),
    ])
    if (!latest) {
      return res.status(404).json({ success: false, message: "You have not attempted this quiz yet" })
    }
    if (!reviewUnlocked(Boolean(passedEver), attemptsUsed)) {
      return res.status(403).json({
        success: false,
        message: "The answer review unlocks once you pass or use all your attempts.",
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        title: quiz.title,
        scorePercent: latest.scorePercent,
        passed: latest.passed,
        passingScorePercent: quiz.passingScorePercent,
        attemptsUsed,
        attemptsAllowed: MAX_ATTEMPTS_PER_QUIZ,
        review: buildReview(quiz.questions, latest.answers),
      },
    })
  } catch (error) {
    return fail(res, error, "getMyQuizReview", "Could not load your quiz review")
  }
}

/**
 * Has this user passed every published course-level quiz for this course?
 * Exported for Certificate.js to use as one of the completion conditions.
 * Lecture-level quizzes (subSection set) don't gate certificate issuance —
 * only course-level ones (subSection null) do, since a lecture quiz is a
 * comprehension check, not a final assessment.
 */
export const hasPassedAllCourseQuizzes = async (
  courseId: Types.ObjectId | string,
  userId: Types.ObjectId | string
) => {
  const courseQuizzes = await Quiz.find({ course: courseId, subSection: null, published: true }).select("_id")
  if (courseQuizzes.length === 0) return true

  // One query, not one per quiz. This runs on every progress heartbeat via
  // checkAndIssueCertificate, so an N+1 here is an N+1 on the hottest path
  // in the whole learning flow.
  const quizIds = courseQuizzes.map((quiz: { _id: Types.ObjectId }) => quiz._id)
  const passedQuizIds = await QuizAttempt.find({
    quiz: { $in: quizIds },
    user: userId,
    passed: true,
  }).distinct("quiz")

  const passed = new Set(passedQuizIds.map(String))
  return quizIds.every((id: Types.ObjectId) => passed.has(String(id)))
}
