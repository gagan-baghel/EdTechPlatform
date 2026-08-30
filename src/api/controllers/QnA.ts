import { z } from "zod"
import type { Types } from "mongoose"
import { fail, parseOrThrow } from "../lib/respond"
import { objectId, paginationQuery, text, toSkip } from "../lib/schemas"
import { containsId } from "../lib/ids"
import type { Response } from "express"
import type { AuthedRequest } from "../lib/http"
import Question from "../models/Question"
import Course from "../models/Course"
import User from "../models/User"
import Section from "../models/Section"
import { notify } from "../utils/notify"

const AskQuestionSchema = z.object({
  courseId: objectId("A valid course id is required"),
  subSectionId: objectId("A valid lecture id is required"),
  text: text({ max: 2000, label: "Question" }),
})

const AnswerSchema = z.object({ text: text({ max: 5000, label: "Answer" }) })

/**
 * A caller may participate (ask/answer) if they're enrolled in the course
 * OR they're the instructor who owns it — a lecture's Q&A isn't useful if
 * the person teaching it can't answer.
 */
async function assertCanParticipate(
  courseId: string,
  userId: Types.ObjectId | string
) {
  const course = await Course.findById(courseId).select("instructor")
  if (!course) return false
  if (course.instructor.toString() === userId) return true

  const user = await User.findById(userId).select("courses")
  return Boolean(containsId(user?.courses, courseId))
}

export const askQuestion = async (req: AuthedRequest, res: Response) => {
  try {
    const { courseId, subSectionId, text: body } = parseOrThrow(AskQuestionSchema, req.body)

    if (!(await assertCanParticipate(courseId, req.user.id))) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to ask a question" })
    }

    const question = await Question.create({
      course: courseId,
      subSection: subSectionId,
      askedBy: req.user.id,
      text: body,
    })

    return res.status(201).json({ success: true, data: question })
  } catch (error) {
    return fail(res, error, "askQuestion", "Could not post your question")
  }
}

export const answerQuestion = async (req: AuthedRequest, res: Response) => {
  try {
    const { questionId } = parseOrThrow(
      z.object({ questionId: objectId("A valid question id is required") }),
      req.params
    )
    const { text: body } = parseOrThrow(AnswerSchema, req.body)

    const question = await Question.findById(questionId)
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" })
    }

    if (!(await assertCanParticipate(question.course.toString(), req.user.id))) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to answer" })
    }

    question.answers.push({ answeredBy: req.user.id, text: body })
    await question.save()

    // Don't notify a user replying to their own question.
    if (question.askedBy.toString() !== req.user.id) {
      await notify(question.askedBy, {
        type: "qna_reply",
        title: "Someone answered your question",
        body,
        link: `/view-course/${question.course}`,
      })
    }

    return res.status(200).json({ success: true, data: question })
  } catch (error) {
    return fail(res, error, "answerQuestion", "Could not post your answer")
  }
}

/**
 * Q&A for one lecture.
 *
 * Requires the same enrolment as posting. It previously required only that
 * the caller be logged in as *somebody*, so any account could read the
 * discussion inside any paid course by iterating lecture ids — course content
 * that students pay for, plus their names and questions. It was also
 * unbounded; a busy lecture returned every question ever asked.
 */
export const listQuestionsForLecture = async (req: AuthedRequest, res: Response) => {
  try {
    const { subSectionId } = parseOrThrow(
      z.object({ subSectionId: objectId("A valid lecture id is required") }),
      req.params
    )
    const { page, limit } = parseOrThrow(paginationQuery({ defaultLimit: 20, maxLimit: 50 }), req.query)
    const { skip } = toSkip({ page, limit })

    const section = await Section.findOne({ subSection: subSectionId }).select("_id")
    if (!section) {
      return res.status(404).json({ success: false, message: "Lecture not found" })
    }
    const course = await Course.findOne({ courseContent: section._id }).select("_id")
    if (!course || !(await assertCanParticipate(course._id.toString(), req.user.id))) {
      return res
        .status(403)
        .json({ success: false, message: "You must be enrolled in this course to view its Q&A" })
    }

    const [questions, total] = await Promise.all([
      Question.find({ subSection: subSectionId })
        .populate("askedBy", "firstName lastName userImage")
        .populate("answers.answeredBy", "firstName lastName userImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Question.countDocuments({ subSection: subSectionId }),
    ])
    return res.status(200).json({ success: true, data: questions, page, limit, total })
  } catch (error) {
    return fail(res, error, "listQuestionsForLecture", "Could not load questions")
  }
}

export const deleteQuestion = async (req: AuthedRequest, res: Response) => {
  try {
    const { questionId } = parseOrThrow(
      z.object({ questionId: objectId("A valid question id is required") }),
      req.params
    )
    const question = await Question.findById(questionId)
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" })
    }

    const course = await Course.findById(question.course).select("instructor")
    const isOwner = question.askedBy.toString() === req.user.id
    const isInstructor = course?.instructor?.toString() === req.user.id
    if (!isOwner && !isInstructor) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this question" })
    }

    await Question.findByIdAndDelete(questionId)
    return res.status(200).json({ success: true, message: "Question deleted" })
  } catch (error) {
    return fail(res, error, "deleteQuestion", "Could not delete question")
  }
}
