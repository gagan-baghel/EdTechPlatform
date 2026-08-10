import { fail } from "../lib/respond"
import type { Types } from "mongoose"
import type { PopulatedSection } from "../lib/populated"
import { containsId } from "../lib/ids"
import type { Response } from "express"
import type { AuthedRequest } from "../lib/http"
import Section from "../models/Section"
import SubSection from "../models/SubSection"
import CourseProgress from "../models/CourseProgress"
import Course from "../models/Course"
import User from "../models/User"
import { emitEvent, EVENT_VERBS } from "../utils/emitEvent"
import { checkAndIssueCertificate } from "./Certificate"

// Auto-complete a lecture once this much of it has been watched, without
// requiring the manual "Mark As Completed" click. 90% rather than 100% —
// end-of-video credits/outros and a player that never quite reaches the
// last fraction of a second shouldn't be the difference between done and
// not done.
const AUTO_COMPLETE_THRESHOLD = 0.9

/**
 * Shared by updateCourseProgress and updateWatchPosition — both need to
 * confirm the caller is actually enrolled and that the subsection really
 * belongs to the course before touching progress for either.
 */
async function verifyEnrollmentAndSubsection(
  userId: Types.ObjectId | string,
  courseId: string,
  subsectionId: string
) {
  const user = await User.findById(userId).select("courses")
  if (!user || !containsId(user.courses, courseId)) {
    return { error: "User is not enrolled in this course" }
  }

  const subsection = await SubSection.findById(subsectionId)
  if (!subsection) {
    return { error: "Invalid subsection" }
  }

  const section = await Section.findOne({ subSection: subsectionId })
  if (!section) {
    return { error: "Invalid subsection" }
  }

  const course = await Course.findOne({ _id: courseId, courseContent: section._id })
  if (!course) {
    return { error: "Subsection does not belong to this course" }
  }

  return { subsection }
}

export const updateCourseProgress = async (req: AuthedRequest, res: Response) => {
  const { courseId, subsectionId } = req.body
  const userId = req.user.id

  try {
    if (!courseId || !subsectionId) {
      return res.status(400).json({ error: "courseId and subsectionId are required" })
    }

    const { error } = await verifyEnrollmentAndSubsection(userId, courseId, subsectionId)
    if (error) {
      return res.status(403).json({ error })
    }

    // upsert rather than 404 — a user enrolled before CourseProgress was
    // guaranteed to be created at enrolment time would otherwise be
    // permanently unable to record progress on that course.
    const courseProgress = await CourseProgress.findOneAndUpdate(
      { courseID: courseId, userId },
      { $setOnInsert: { completedVideos: [] } },
      { new: true, upsert: true }
    )

    if (courseProgress.completedVideos.includes(subsectionId)) {
      return res.status(400).json({ error: "Subsection already completed" })
    }

    courseProgress.completedVideos.push(subsectionId)
    await courseProgress.save()

    await emitEvent(EVENT_VERBS.LECTURE_COMPLETED, {
      actor: userId,
      object: { type: "SubSection", id: subsectionId },
      context: { courseId },
    })

    await checkAndIssueCertificate(userId, courseId)

    return res.status(200).json({ message: "Course progress updated" })
  } catch (error) {
    return fail(res, error, "updateCourseProgress")
  }
}

/**
 * Heartbeat from the player — called periodically while a lecture plays
 * (throttled client-side, not per video frame). Records where the viewer
 * actually is, not just whether they clicked a button at the end.
 */
export const updateWatchPosition = async (req: AuthedRequest, res: Response) => {
  const { courseId, subsectionId, positionSeconds, durationSeconds } = req.body
  const userId = req.user.id

  try {
    if (!courseId || !subsectionId || positionSeconds === undefined) {
      return res.status(400).json({
        success: false,
        error: "courseId, subsectionId and positionSeconds are required",
      })
    }

    const position = Number(positionSeconds)
    if (!Number.isFinite(position) || position < 0) {
      return res.status(400).json({ success: false, error: "Invalid positionSeconds" })
    }

    const { error } = await verifyEnrollmentAndSubsection(userId, courseId, subsectionId)
    if (error) {
      return res.status(403).json({ success: false, error })
    }

    const courseProgress = await CourseProgress.findOneAndUpdate(
      { courseID: courseId, userId },
      { $setOnInsert: { completedVideos: [] } },
      { new: true, upsert: true }
    )

    const existingEntry = courseProgress.watchState.find(
      (entry: { subSection: unknown }) => String(entry.subSection) === subsectionId
    )
    const isFirstHeartbeatForThisLecture = !existingEntry

    if (existingEntry) {
      existingEntry.positionSeconds = position
      existingEntry.updatedAt = new Date()
    } else {
      courseProgress.watchState.push({ subSection: subsectionId, positionSeconds: position })
    }
    courseProgress.lastWatchedSubSection = subsectionId

    const duration = Number(durationSeconds)
    const watchedEnough =
      Number.isFinite(duration) && duration > 0 && position / duration >= AUTO_COMPLETE_THRESHOLD

    let justCompleted = false
    if (watchedEnough && !courseProgress.completedVideos.includes(subsectionId)) {
      courseProgress.completedVideos.push(subsectionId)
      justCompleted = true
    }

    await courseProgress.save()

    if (isFirstHeartbeatForThisLecture) {
      await emitEvent(EVENT_VERBS.LECTURE_STARTED, {
        actor: userId,
        object: { type: "SubSection", id: subsectionId },
        context: { courseId },
      })
    } else {
      await emitEvent(EVENT_VERBS.LECTURE_PROGRESSED, {
        actor: userId,
        object: { type: "SubSection", id: subsectionId },
        context: { courseId, positionSeconds: position },
      })
    }

    if (justCompleted) {
      await emitEvent(EVENT_VERBS.LECTURE_COMPLETED, {
        actor: userId,
        object: { type: "SubSection", id: subsectionId },
        context: { courseId, auto: true },
      })
      await checkAndIssueCertificate(userId, courseId)
    }

    return res.status(200).json({ success: true, autoCompleted: justCompleted })
  } catch (error) {
    return fail(res, error, "updateWatchPosition")
  }
}

export const getProgressPercentage = async (req: AuthedRequest, res: Response) => {
  const { courseId } = req.body
  const userId = req.user.id

  if (!courseId) {
    return res.status(400).json({ error: "Course ID not provided." })
  }

  try {
    const courseProgress = await CourseProgress.findOne({
      courseID: courseId,
      userId: userId,
    })
      .populate({
        path: "courseID",
        populate: {
          path: "courseContent",
        },
      })
      .exec()

    if (!courseProgress) {
      return res
        .status(400)
        .json({ error: "Can not find Course Progress with these IDs." })
    }
    let lectures = 0
    courseProgress.courseID.courseContent?.forEach((sec: PopulatedSection) => {
      lectures += sec.subSection.length || 0
    })

    let progressPercentage =
      lectures > 0 ? (courseProgress.completedVideos.length / lectures) * 100 : 0

    const multiplier = Math.pow(10, 2)
    progressPercentage = Math.round(progressPercentage * multiplier) / multiplier

    return res.status(200).json({
      data: progressPercentage,
      message: "Succesfully fetched Course progress",
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
