const Quiz = require("../models/Quiz")
const QuizAttempt = require("../models/QuizAttempt")
const Course = require("../models/Course")
const User = require("../models/User")
const { recordAudit } = require("../utils/recordAudit")
const { emitEvent, EVENT_VERBS } = require("../utils/emitEvent")

async function assertCourseOwnership(courseId, instructorId) {
  const course = await Course.findOne({ _id: courseId, instructor: instructorId })
  return course
}

exports.createQuiz = async (req, res) => {
  try {
    const { courseId, subSectionId, title, questions, passingScorePercent } = req.body
    if (!courseId || !title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: "courseId, title and at least one question are required" })
    }

    const course = await assertCourseOwnership(courseId, req.user.id)
    if (!course) {
      return res.status(403).json({ success: false, message: "Not authorized to add a quiz to this course" })
    }

    for (const q of questions) {
      if (!q.questionText || !Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ success: false, message: "Every question needs text and at least 2 options" })
      }
      if (
        q.correctOptionIndex === undefined ||
        q.correctOptionIndex < 0 ||
        q.correctOptionIndex >= q.options.length
      ) {
        return res.status(400).json({ success: false, message: "correctOptionIndex must point at a real option" })
      }
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
    console.error("createQuiz failed", error)
    return res.status(500).json({ success: false, message: "Could not create quiz" })
  }
}

exports.updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params
    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }

    const course = await assertCourseOwnership(quiz.course, req.user.id)
    if (!course) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this quiz" })
    }

    const { title, questions, passingScorePercent, published } = req.body
    if (title !== undefined) quiz.title = title
    if (questions !== undefined) quiz.questions = questions
    if (passingScorePercent !== undefined) quiz.passingScorePercent = passingScorePercent
    if (published !== undefined) quiz.published = published

    await quiz.save()

    return res.status(200).json({ success: true, data: quiz })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not update quiz" })
  }
}

exports.deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params
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
    return res.status(500).json({ success: false, message: "Could not delete quiz" })
  }
}

// Instructor view — includes correct answers and unpublished drafts.
exports.listQuizzesForCourseInstructor = async (req, res) => {
  try {
    const { courseId } = req.params
    const course = await assertCourseOwnership(courseId, req.user.id)
    if (!course) {
      return res.status(403).json({ success: false, message: "Not authorized" })
    }
    const quizzes = await Quiz.find({ course: courseId }).lean()
    return res.status(200).json({ success: true, data: quizzes })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not list quizzes" })
  }
}

// Student-facing discovery: which quizzes exist for a course they're
// enrolled in. Titles/ids only — no questions, so this is safe to call
// before deciding to start a specific quiz.
exports.listQuizzesForCourseStudent = async (req, res) => {
  try {
    const { courseId } = req.params
    const userId = req.user.id

    const user = await User.findById(userId).select("courses")
    if (!user?.courses?.some((id) => id.toString() === courseId)) {
      return res.status(403).json({ success: false, message: "You are not enrolled in this course" })
    }

    const quizzes = await Quiz.find(
      { course: courseId, published: true },
      { title: 1, subSection: 1, passingScorePercent: 1, questions: 1 }
    ).lean()

    const summarized = quizzes.map((q) => ({
      _id: q._id,
      title: q.title,
      subSection: q.subSection,
      passingScorePercent: q.passingScorePercent,
      questionCount: q.questions.length,
    }))

    return res.status(200).json({ success: true, data: summarized })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not list quizzes" })
  }
}

// Student view — published quizzes only, correct answers stripped. The
// whole reason this is a separate endpoint from the instructor one rather
// than a query-param toggle: forgetting a toggle leaks answers, a
// separate code path structurally can't.
exports.getQuizForStudent = async (req, res) => {
  try {
    const { quizId } = req.params
    const userId = req.user.id

    const quiz = await Quiz.findOne({ _id: quizId, published: true }).lean()
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }

    const user = await User.findById(userId).select("courses")
    if (!user?.courses?.some((id) => id.toString() === quiz.course.toString())) {
      return res.status(403).json({ success: false, message: "You are not enrolled in this course" })
    }

    const sanitized = {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
      })),
    }

    return res.status(200).json({ success: true, data: sanitized })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load quiz" })
  }
}

exports.submitQuizAttempt = async (req, res) => {
  try {
    const { quizId } = req.params
    const { answers } = req.body
    const userId = req.user.id

    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: "answers array is required" })
    }

    const quiz = await Quiz.findOne({ _id: quizId, published: true })
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }

    const user = await User.findById(userId).select("courses")
    if (!user?.courses?.some((id) => id.toString() === quiz.course.toString())) {
      return res.status(403).json({ success: false, message: "You are not enrolled in this course" })
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
      data: { scorePercent, passed, passingScorePercent: quiz.passingScorePercent, attemptId: attempt._id },
    })
  } catch (error) {
    console.error("submitQuizAttempt failed", error)
    return res.status(500).json({ success: false, message: "Could not submit quiz attempt" })
  }
}

exports.listMyAttempts = async (req, res) => {
  try {
    const { quizId } = req.params
    const attempts = await QuizAttempt.find({ quiz: quizId, user: req.user.id })
      .sort({ createdAt: -1 })
      .lean()
    return res.status(200).json({ success: true, data: attempts })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load attempt history" })
  }
}

/**
 * Has this user passed every published course-level quiz for this course?
 * Exported for Certificate.js to use as one of the completion conditions.
 * Lecture-level quizzes (subSection set) don't gate certificate issuance —
 * only course-level ones (subSection null) do, since a lecture quiz is a
 * comprehension check, not a final assessment.
 */
exports.hasPassedAllCourseQuizzes = async (courseId, userId) => {
  const courseQuizzes = await Quiz.find({ course: courseId, subSection: null, published: true }).select("_id")
  if (courseQuizzes.length === 0) return true

  for (const quiz of courseQuizzes) {
    const passedAttempt = await QuizAttempt.findOne({ quiz: quiz._id, user: userId, passed: true })
    if (!passedAttempt) return false
  }
  return true
}
