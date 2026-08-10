import type { Types } from "mongoose"
import { fail } from "../lib/respond"
import { containsId } from "../lib/ids"
import type { Request, Response } from "express"
import type { AuthedRequest } from "../lib/http"
import Question from "../models/Question"
import Course from "../models/Course"
import User from "../models/User"
import { notify } from "../utils/notify"

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
    const { courseId, subSectionId, text } = req.body
    if (!courseId || !subSectionId || !text?.trim()) {
      return res.status(400).json({ success: false, message: "courseId, subSectionId and text are required" })
    }

    if (!(await assertCanParticipate(courseId, req.user.id))) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to ask a question" })
    }

    const question = await Question.create({
      course: courseId,
      subSection: subSectionId,
      askedBy: req.user.id,
      text: text.trim(),
    })

    return res.status(201).json({ success: true, data: question })
  } catch (error) {
    return fail(res, error, "askQuestion", "Could not post your question")
  }
}

export const answerQuestion = async (req: AuthedRequest, res: Response) => {
  try {
    const { questionId } = req.params
    const { text } = req.body
    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: "text is required" })
    }

    const question = await Question.findById(questionId)
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" })
    }

    if (!(await assertCanParticipate(question.course.toString(), req.user.id))) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to answer" })
    }

    question.answers.push({ answeredBy: req.user.id, text: text.trim() })
    await question.save()

    // Don't notify a user replying to their own question.
    if (question.askedBy.toString() !== req.user.id) {
      await notify(question.askedBy, {
        type: "qna_reply",
        title: "Someone answered your question",
        body: text.trim(),
        link: `/view-course/${question.course}`,
      })
    }

    return res.status(200).json({ success: true, data: question })
  } catch (error) {
    return fail(res, error, "answerQuestion", "Could not post your answer")
  }
}

export const listQuestionsForLecture = async (req: Request, res: Response) => {
  try {
    const { subSectionId } = req.params
    const questions = await Question.find({ subSection: subSectionId })
      .populate("askedBy", "firstName lastName userImage")
      .populate("answers.answeredBy", "firstName lastName userImage")
      .sort({ createdAt: -1 })
      .lean()
    return res.status(200).json({ success: true, data: questions })
  } catch (error) {
    return fail(res, error, "listQuestionsForLecture", "Could not load questions")
  }
}

export const deleteQuestion = async (req: AuthedRequest, res: Response) => {
  try {
    const { questionId } = req.params
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
