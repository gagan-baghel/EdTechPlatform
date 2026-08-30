import { z } from "zod"
import type { Types } from "mongoose"
import { fail, parseOrThrow } from "../lib/respond"
import { text } from "../lib/schemas"
import { isDuplicateKeyError } from "../lib/AppError"
import type { Request, Response } from "express"
import type { AuthedRequest } from "../lib/http"
import Certificate from "../models/Certificate"
import Course from "../models/Course"
import CourseProgress from "../models/CourseProgress"
import { hasPassedAllCourseQuizzes } from "./Quiz"
import { emitEvent, EVENT_VERBS } from "../utils/emitEvent"
import { notify } from "../utils/notify"

/**
 * Auto-issues a certificate the moment a student has watched every
 * lecture AND passed every published course-level quiz (lecture-level
 * quizzes don't gate this — see hasPassedAllCourseQuizzes). Called from
 * courseProgress.js after every progress update; idempotent via the
 * unique {user, course} index, so calling it on every heartbeat that
 * happens to complete a course is safe — no duplicate-issue race.
 */
export async function checkAndIssueCertificate(
  userId: Types.ObjectId | string,
  courseId: Types.ObjectId | string
) {
  try {
    const existing = await Certificate.findOne({ user: userId, course: courseId })
    if (existing) return existing

    const course = await Course.findById(courseId).populate({
      path: "courseContent",
      populate: { path: "subSection", select: "_id" },
    })
    if (!course) return null

    const totalLectures = course.courseContent.reduce(
      (sum: number, section: { subSection?: unknown[] }) =>
          sum + (section.subSection?.length || 0),
      0
    )
    if (totalLectures === 0) return null

    const progress = await CourseProgress.findOne({ courseID: courseId, userId })
    const completedCount = progress?.completedVideos?.length || 0
    if (completedCount < totalLectures) return null

    const passedQuizzes = await hasPassedAllCourseQuizzes(courseId, userId)
    if (!passedQuizzes) return null

    const certificate = await Certificate.create({
      user: userId,
      course: courseId,
      certificateNumber: Certificate.generateCertificateNumber(),
    })

    await emitEvent(EVENT_VERBS.CERTIFICATE_EARNED, {
      actor: userId,
      object: { type: "Course", id: courseId },
      context: { certificateNumber: certificate.certificateNumber },
    })

    await notify(userId, {
      type: "certificate_earned",
      title: `You earned a certificate for ${course.courseName}`,
      body: `Congratulations on completing "${course.courseName}"! Your certificate is ready.`,
      link: `/certificates/${certificate.certificateNumber}`,
    })

    return certificate
  } catch (error) {
    // A duplicate-key error here means a concurrent call already issued
    // it — not a real failure. Anything else is logged but never thrown:
    // certificate issuance must never break the progress update it rides
    // alongside.
    if (!isDuplicateKeyError(error)) {
      console.error("checkAndIssueCertificate failed", error)
    }
    return null
  }
}

export const getMyCertificates = async (req: AuthedRequest, res: Response) => {
  try {
    const certificates = await Certificate.find({ user: req.user.id })
      .populate("course", "courseName thumbnail")
      .sort({ issuedAt: -1 })
      .limit(200)
      .lean()
    return res.status(200).json({ success: true, data: certificates })
  } catch (error) {
    return fail(res, error, "getMyCertificates", "Could not load certificates")
  }
}

// Public — no auth. A certificate's whole purpose is that a third party
// (an employer) can verify it without needing an account.
export const verifyCertificate = async (req: Request, res: Response) => {
  try {
    const { certificateNumber } = parseOrThrow(
      z.object({ certificateNumber: text({ max: 64, label: "Certificate number" }) }),
      req.params
    )
    const certificate = await Certificate.findOne({ certificateNumber })
      .populate("user", "firstName lastName")
      .populate("course", "courseName")
      .lean()

    if (!certificate) {
      return res.status(404).json({ success: false, message: "No certificate found with that number" })
    }

    // user and course are populated above; Mongoose's chained typings still
    // report the schema's ObjectId refs.
    const issued = certificate as unknown as {
      user: { firstName: string; lastName: string }
      course: { courseName: string }
    }

    return res.status(200).json({
      success: true,
      data: {
        certificateNumber: certificate.certificateNumber,
        studentName: `${issued.user.firstName} ${issued.user.lastName}`,
        courseName: issued.course.courseName,
        issuedAt: certificate.issuedAt,
      },
    })
  } catch (error) {
    return fail(res, error, "verifyCertificate", "Could not verify certificate")
  }
}
