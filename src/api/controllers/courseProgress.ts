import { z } from "zod"
import { fail, parseOrThrow } from "../lib/respond"
import { objectId } from "../lib/schemas"
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

const ProgressSchema = z.object({
  courseId: objectId("A valid course id is required"),
  subsectionId: objectId("A valid lecture id is required"),
})

const WatchPositionSchema = ProgressSchema.extend({
  positionSeconds: z.coerce.number().finite().min(0, "Invalid positionSeconds"),
  durationSeconds: z.coerce.number().finite().min(0).optional(),
})

const CourseIdSchema = z.object({
  courseId: objectId("A valid course id is required"),
})

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
  const userId = req.user.id

  try {
    const { courseId, subsectionId } = parseOrThrow(ProgressSchema, req.body)

    const { error } = await verifyEnrollmentAndSubsection(userId, courseId, subsectionId)
    if (error) {
      return res.status(403).json({ success: false, error })
    }

    /**
     * One atomic `$addToSet`, upserting.
     *
     * The previous version read the document, checked `completedVideos
     * .includes(...)`, pushed, and saved — a check-then-act that two tabs (or
     * the player's auto-complete racing the manual button) both pass, so the
     * same lecture ends up in the array twice and progress reads over 100%.
     * `$addToSet` makes the duplicate impossible in the database rather than
     * hoping the read and the write are close enough together.
     *
     * Upsert rather than 404: a user enrolled before CourseProgress was
     * guaranteed at enrolment time would otherwise never be able to record
     * progress on that course.
     */
    const result = await CourseProgress.updateOne(
      { courseID: courseId, userId },
      { $addToSet: { completedVideos: subsectionId } },
      { upsert: true }
    )

    // Nothing changed => it was already complete. Reported as success, not a
    // 400: re-marking a finished lecture is a no-op, not a client error, and
    // the old 400 surfaced as an error toast on a perfectly normal double-click.
    if (result.modifiedCount === 0 && result.upsertedCount === 0) {
      return res.status(200).json({ success: true, message: "Course progress updated" })
    }

    await emitEvent(EVENT_VERBS.LECTURE_COMPLETED, {
      actor: userId,
      object: { type: "SubSection", id: subsectionId },
      context: { courseId },
    })

    await checkAndIssueCertificate(userId, courseId)

    return res.status(200).json({ success: true, message: "Course progress updated" })
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
  const userId = req.user.id

  try {
    const {
      courseId,
      subsectionId,
      positionSeconds: position,
      durationSeconds: duration,
    } = parseOrThrow(WatchPositionSchema, req.body)

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

    const watchedEnough =
      duration !== undefined && duration > 0 && position / duration >= AUTO_COMPLETE_THRESHOLD

    const alreadyComplete = courseProgress.completedVideos.some(
      (id: unknown) => String(id) === subsectionId
    )

    await courseProgress.save()

    // Completion is a separate atomic write for the same reason as
    // updateCourseProgress: two concurrent heartbeats must not both push.
    let justCompleted = false
    if (watchedEnough && !alreadyComplete) {
      const completion = await CourseProgress.updateOne(
        { _id: courseProgress._id },
        { $addToSet: { completedVideos: subsectionId } }
      )
      justCompleted = completion.modifiedCount > 0
    }

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
  const userId = req.user.id

  try {
    const { courseId } = parseOrThrow(CourseIdSchema, req.body)

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

    // No progress document yet simply means nothing has been watched. This
    // used to answer 400, so a freshly enrolled student's course page showed
    // an error instead of 0%.
    if (!courseProgress) {
      return res.status(200).json({ success: true, data: 0 })
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
      success: true,
      data: progressPercentage,
      message: "Succesfully fetched Course progress",
    })
  } catch (error) {
    return fail(res, error, "getProgressPercentage", "Could not load your progress.")
  }
}
