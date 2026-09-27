import type { PopulatedSection } from "../lib/populated"
import { containsId } from "../lib/ids"
import type { Request, Response } from "express"
import { getEnv } from "../config/env"
import mongoose, { type FilterQuery, type PipelineStage } from "mongoose"

import type { CourseLevel } from "@/types/domain"
import { COURSE_LEVEL_VALUES, COURSE_STATUS_VALUES } from "@/types/domain"
import { fail, parseOrThrow } from "../lib/respond"
import { z } from "zod"
import type { AuthedRequest } from "../lib/http"
import { requireFile, singleFile } from "../lib/request"
import { objectId, paginationQuery, toSkip } from "../lib/schemas"
import Course from "../models/Course"
import Category from "../models/Category"
import Section from "../models/Section"
import SubSection from "../models/SubSection"
import User from "../models/User"
import { uploadImageToCloudinary } from "../utils/imageUploader"
import CourseProgress from "../models/CourseProgress"
import Certificate from "../models/Certificate"
import { convertSecondsToDuration } from "../utils/secToDuration"
import { emitEvent, EVENT_VERBS } from "../utils/emitEvent"
import { recordAudit } from "../utils/recordAudit"

const isValidId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id)

/** The catalogue filter, incrementally built from query parameters. */
interface CourseSearchFilter {
  status: string
  deletedAt: null
  price?: { $gte?: number; $lte?: number }
  level?: CourseLevel
  category?: string
}
// Function to create a new course
export const createCourse = async (req: AuthedRequest, res: Response) => {
  try {
    // Get user ID from request object
    const userId = req.user.id

    // Get all required fields from request body
    const {
      courseName,
      courseDescription,
      whatYouWillLearn,
      price,
      tag,
      category,
      instructions,
    } = parseOrThrow(
      z.object({
        courseName: z.string().min(1, "All Fields are Mandatory"),
        courseDescription: z.string().min(1, "All Fields are Mandatory"),
        whatYouWillLearn: z.string().min(1, "All Fields are Mandatory"),
        price: z.coerce.number().min(0, "All Fields are Mandatory"),
        category: objectId("A valid category is required"),
        tag: z.string().transform((val, ctx) => {
          try {
            const parsed = JSON.parse(val)
            if (!Array.isArray(parsed) || parsed.length === 0) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: "All Fields are Mandatory" })
              return z.NEVER
            }
            return parsed
          } catch {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid tag or instructions format" })
            return z.NEVER
          }
        }),
        instructions: z.string().transform((val, ctx) => {
          try {
            const parsed = JSON.parse(val)
            if (!Array.isArray(parsed) || parsed.length === 0) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: "All Fields are Mandatory" })
              return z.NEVER
            }
            return parsed
          } catch {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid tag or instructions format" })
            return z.NEVER
          }
        }),
      }),
      req.body
    )

    // Get thumbnail image from request files
    const thumbnail = singleFile(req, "thumbnailImage")

    if (!thumbnail) {
      return res.status(400).json({
        success: false,
        message: "All Fields are Mandatory",
      })
    }
    // Check if the user is an instructor
    const instructorDetails = await User.findOne({
      _id: userId,
      accountType: "Instructor",
    })

    if (!instructorDetails) {
      return res.status(404).json({
        success: false,
        message: "Instructor Details Not Found",
      })
    }

    // Check if the tag given is valid
    const categoryDetails = await Category.findById(category)
    if (!categoryDetails) {
      return res.status(404).json({
        success: false,
        message: "Category Details Not Found",
      })
    }
    // Upload the Thumbnail to Cloudinary
    const thumbnailImage = await uploadImageToCloudinary(
      thumbnail,
      getEnv().FOLDER_NAME
    )
    // Create a new course with the given details
    const newCourse = await Course.create({
      courseName,
      courseDescription,
      instructor: instructorDetails._id,
      whatYouWillLearn: whatYouWillLearn,
      price,
      tag,
      category: categoryDetails._id,
      thumbnail: thumbnailImage.secure_url,
      // Always Draft. `status` used to be read from the request body, which
      // let an instructor POST status:"Published" and skip the readiness
      // checks in editCourse entirely — publishing a course with no lessons,
      // no thumbnail and no price straight into the public catalogue.
      // Publishing goes through editCourse, which enforces those checks.
      status: "Draft",
      instructions,
    })

    // Add the new course to the User Schema of the Instructor
    await User.findByIdAndUpdate(
      {
        _id: instructorDetails._id,
      },
      {
        $push: {
          courses: newCourse._id,
        },
      },
      { new: true }
    )
    // Add the new course to the Categories
    await Category.findByIdAndUpdate(
      { _id: category },
      {
        $push: {
          courses: newCourse._id,
        },
      },
      { new: true }
    )
    // Return the new course and a success message
    res.status(200).json({
      success: true,
      data: newCourse,
      message: "Course Created Successfully",
    })
  } catch (error) {
    // Handle any errors that occur during the creation of the course
    fail(res, error, "createCourse", "Failed to create course")}
}
// Edit Course Details
export const editCourse = async (req: AuthedRequest, res: Response) => {
  try {
    const EditCourseSchema = z.object({
      courseId: objectId("A valid course id is required"),
      courseName: z.string().optional(),
      courseDescription: z.string().optional(),
      price: z.coerce.number().optional(),
      whatYouWillLearn: z.string().optional(),
      category: objectId().optional(),
      // Enums, not free strings: an unlisted value used to reach
      // `course.save()` and fail Mongoose validation as an opaque 500,
      // and a value like "Published " (trailing space) would have made the
      // course invisible to every catalogue query that filters on it.
      status: z.enum(COURSE_STATUS_VALUES).optional(),
      tag: z.string().transform((val, ctx) => {
        try { return JSON.parse(val) } catch {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid tag format" })
          return z.NEVER
        }
      }).optional(),
      instructions: z.string().transform((val, ctx) => {
        try { return JSON.parse(val) } catch {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid instructions format" })
          return z.NEVER
        }
      }).optional(),
      level: z.enum(COURSE_LEVEL_VALUES).optional(),
      language: z.string().optional(),
      scheduledPublishAt: z.union([z.string(), z.null()]).transform(v => v ? new Date(v) : null).optional(),
    })

    const { courseId, ...updates } = parseOrThrow(EditCourseSchema, req.body)
    const course = await Course.findById(courseId)

    if (!course) {
      return res.status(404).json({ error: "Course not found" })
    }
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to edit this course" })
    }

    // A course may only go live once it actually has something to teach.
    // Enforced here because the client checklist is bypassable.
    if (updates.status === "Published") {
      const populated = await Course.findById(courseId).populate({
        path: "courseContent",
        populate: { path: "subSection" },
      })

      const lessonCount = (populated?.courseContent ?? []).reduce(
        (total: number, section: { subSection?: unknown[] }) =>
          total + (section?.subSection?.length ?? 0),
        0
      )

      const missing = []
      if (lessonCount === 0) missing.push("at least one lesson with a video")
      if (!populated?.thumbnail) missing.push("a thumbnail image")
      if (!populated?.courseDescription) missing.push("a course description")
      if (!populated?.whatYouWillLearn) missing.push("the learning outcomes")
      if (populated?.price === undefined || populated?.price === null)
        missing.push("a price")

      if (missing.length) {
        return res.status(400).json({
          success: false,
          message: `This course is not ready to publish. Please add ${missing.join(", ")}.`,
        })
      }
    }

    // If Thumbnail Image is found, update it
    if (req.files && req.files.thumbnailImage) {
      const thumbnail = requireFile(req, "thumbnailImage")
      const thumbnailImage = await uploadImageToCloudinary(
        thumbnail,
        getEnv().FOLDER_NAME
      )
      course.thumbnail = thumbnailImage.secure_url
    }

    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        (course as Record<string, unknown>)[key] = (updates as Record<string, unknown>)[key]
      }
    }

    await course.save()

    const updatedCourse = await Course.findOne({
      _id: courseId,
    })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      // .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        options: { sort: { order: 1 } },
        populate: {
          path: "subSection",
          options: { sort: { order: 1 } },
        },
      })
      .exec()

    res.json({
      success: true,
      message: "Course updated successfully",
      data: updatedCourse,
    })
  } catch (error) {
    fail(res, error, "editCourse", "Internal server error")}
}
// Get Course List
/**
 * The public catalogue.
 *
 * Paginated. It previously returned every published course in one unbounded
 * query — fine at 20 courses, a growing full-collection read and an ever-
 * larger JSON payload on the homepage at 20,000.
 */
/**
 * The homepage's figures, counted rather than written into the page. Public
 * and the same for every visitor, so the CDN may serve it for five minutes.
 */
export const getPublicStats = async (_req: Request, res: Response) => {
  try {
    const [courses, learners, instructors, certificates] = await Promise.all([
      Course.countDocuments({ status: "Published", deletedAt: null }),
      User.countDocuments({ accountType: "Student", active: true }),
      User.countDocuments({ accountType: "Instructor", active: true }),
      Certificate.estimatedDocumentCount(),
    ])
    res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")
    return res.status(200).json({ success: true, data: { courses, learners, instructors, certificates } })
  } catch (error) {
    return fail(res, error, "getPublicStats", "Could not load stats")
  }
}

export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const { page, limit } = parseOrThrow(paginationQuery({ defaultLimit: 24, maxLimit: 60 }), req.query)
    const { skip } = toSkip({ page, limit })

    const filter = { status: "Published", deletedAt: null }
    const allCourses = await Course.find(
      filter,
      {
        courseName: true,
        price: true,
        thumbnail: true,
        instructor: true,
        ratingAndReviews: true,
        studentsEnrolled: true,
      }
    )
      // This route has no auth guard — scope the populate to the fields the
      // catalog actually renders, or an unauthenticated caller gets every
      // instructor's password hash and live reset token along for free.
      .populate("instructor", "firstName lastName userImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec()

    const total = await Course.countDocuments(filter)

    return res.status(200).json({
      success: true,
      data: allCourses,
      page,
      limit,
      total,
    })
  } catch (error) {
    // `error: toErrorMessage(error)` used to be returned here, handing an
    // unauthenticated caller the driver's own message.
    return fail(res, error, "getAllCourses", "Could not load the course catalogue.")
  }
}

const CourseIdSchema = z.object({ courseId: z.string() })

export const getCourseDetails = async (req: Request, res: Response) => {
  try {
    const { courseId } = parseOrThrow(CourseIdSchema, req.body)
    const courseDetails = await Course.findOne({
      _id: courseId,
      deletedAt: null,
    })
      // This route has no auth guard — scope to what the course page
      // renders. The nested additionalDetails populate is kept because the
      // page reads instructor.additionalDetails.about.
      .populate({
        path: "instructor",
        select: "firstName lastName userImage additionalDetails",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        options: { sort: { order: 1 } },
        populate: {
          path: "subSection",
          options: { sort: { order: 1 } },
        },
      })
      .exec()

    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find course with id: ${courseId}`,
      })
    }

    // if (courseDetails.status === "Draft") {
    //   return res.status(403).json({
    //     success: false,
    //     message: `Accessing a draft course is forbidden`,
    //   });
    // }

    // This route is unauthenticated, so nobody viewing it is confirmed
    // enrolled — strip videoUrl for every lecture except the ones an
    // instructor explicitly marked as a free preview. Previously this
    // stripped videoUrl unconditionally, so free-preview couldn't exist.
    courseDetails.courseContent.forEach((content: PopulatedSection) => {
      content.subSection.forEach((subSection) => {
        if (!subSection.freePreview) {
          subSection.videoUrl = ""
        }
      })
    })

    let totalDurationInSeconds = 0
    courseDetails.courseContent.forEach((content: PopulatedSection) => {
      content.subSection.forEach((subSection) => {
        const timeDurationInSeconds = parseInt(subSection.timeDuration)
        totalDurationInSeconds += timeDurationInSeconds
      })
    })

    const totalDuration = convertSecondsToDuration(totalDurationInSeconds)

    // No auth on this route, so the viewer's identity isn't known — actor
    // is null (anonymous), which is the documented case in Event.js.
    await emitEvent(EVENT_VERBS.COURSE_VIEWED, {
      object: { type: "Course", id: courseDetails._id },
    })

    return res.status(200).json({
      success: true,
      data: {
        courseDetails,
        totalDuration,
      },
    })
  } catch (error) {
    return fail(res, error, "getCourseDetails")}
}

export const getFullCourseDetails = async (req: AuthedRequest, res: Response) => {
  try {
    const { courseId } = parseOrThrow(CourseIdSchema, req.body)
    const userId = req.user.id
    const courseDetails = await Course.findOne({
      _id: courseId,
    })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        options: { sort: { order: 1 } },
        populate: {
          path: "subSection",
          options: { sort: { order: 1 } },
        },
      })
      .exec()

    const courseProgressCount = await CourseProgress.findOne({
      courseID: courseId,
      userId: userId,
    })


    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find course with id: ${courseId}`,
      })
    }
    if (
      courseDetails.instructor.toString() !== userId &&
      !containsId(courseDetails.studentsEnrolled, userId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      })
    }

    // if (courseDetails.status === "Draft") {
    //   return res.status(403).json({
    //     success: false,
    //     message: `Accessing a draft course is forbidden`,
    //   });
    // }

    let totalDurationInSeconds = 0
    courseDetails.courseContent.forEach((content: PopulatedSection) => {
      content.subSection.forEach((subSection) => {
        const timeDurationInSeconds = parseInt(subSection.timeDuration)
        totalDurationInSeconds += timeDurationInSeconds
      })
    })

    const totalDuration = convertSecondsToDuration(totalDurationInSeconds)

    await emitEvent(EVENT_VERBS.COURSE_VIEWED, {
      actor: userId,
      object: { type: "Course", id: courseDetails._id },
      context: { authenticated: true },
    })

    return res.status(200).json({
      success: true,
      data: {
        courseDetails,
        totalDuration,
        completedVideos: courseProgressCount?.completedVideos
          ? courseProgressCount?.completedVideos
          : [],
        // Progress v2 — lets the player resume exactly where the viewer
        // left off instead of always starting a lecture from 0:00.
        watchState: courseProgressCount?.watchState ?? [],
        lastWatchedSubSection: courseProgressCount?.lastWatchedSubSection ?? null,
      },
    })
  } catch (error) {
    return fail(res, error, "getFullCourseDetails")}
}

// Get a list of Course for a given Instructor
export const getInstructorCourses = async (req: AuthedRequest, res: Response) => {
  try {
    // Get the instructor ID from the authenticated user or request body
    const instructorId = req.user.id

    // Find all courses belonging to the instructor. Soft-deleted courses
    // (ones with paying students, removed from public listings — see
    // deleteCourse) are excluded from the active table; there is no
    // trash/restore UI yet for an instructor to manage them directly.
    const instructorCourses = await Course.find({
      instructor: instructorId,
      deletedAt: null,
    }).sort({ createdAt: -1 })

    // Return the instructor's courses
    res.status(200).json({
      success: true,
      data: instructorCourses,
    })
  } catch (error) {
    fail(res, error, "getInstructorCourses", "Failed to retrieve instructor courses")}
}
// Delete the Course
export const deleteCourse = async (req: AuthedRequest, res: Response) => {
  try {
    const { courseId } = parseOrThrow(CourseIdSchema, req.body)

    // Find the course
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this course" })
    }

    // A course with paying students is soft-deleted: it disappears from
    // public listings/search, but enrolled students keep their access,
    // progress, and reviews, and the instructor keeps their payout history
    // against it. Deleting it used to strip that access unconditionally —
    // wrong for anyone who already paid. An empty course (nobody bought it
    // yet) has no buyer relationship to protect, so it's still hard-deleted,
    // matching the previous behavior for the common "delete my draft" case.
    if (course.studentsEnrolled?.length) {
      course.deletedAt = new Date()
      await course.save()

      if (course.category) {
        await Category.findByIdAndUpdate(course.category, {
          $pull: { courses: courseId },
        })
      }

      return res.status(200).json({
        success: true,
        message: "Course removed from listings. Enrolled students keep their access.",
      })
    }

    // Remove course from category
    if (course.category) {
      await Category.findByIdAndUpdate(course.category, {
        $pull: { courses: courseId },
      })
    }
    // Remove course from instructor
    await User.findByIdAndUpdate(course.instructor, {
      $pull: { courses: courseId },
    })

    // Delete sections and sub-sections
    const courseSections = course.courseContent
    for (const sectionId of courseSections) {
      // Delete sub-sections of the section
      const section = await Section.findById(sectionId)
      if (section) {
        const subSections = section.subSection
        for (const subSectionId of subSections) {
          await SubSection.findByIdAndDelete(subSectionId)
        }
      }

      // Delete the section
      await Section.findByIdAndDelete(sectionId)
    }

    // Delete the course
    await Course.findByIdAndDelete(courseId)

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    })
  } catch (error) {
    return fail(res, error, "deleteCourse", "Server error")}
}

// Search across published courses. Uses the Mongo text index (see the
// coursesSchema.index({...}, {name:"course_text_search"}) declaration in
// Course.js) when it's available, and falls back to a bounded regex scan
// so search still works before the index finishes building on a fresh
// database, or before scripts/ensure-indexes.js has been run at all.
export const searchCourses = async (req: Request, res: Response) => {
  try {
    const SearchCoursesSchema = z.object({
      q: z.string().optional().default("").transform(v => v.trim()).refine(v => v.length >= 2, "Please enter at least 2 characters to search."),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(50).default(12),
      minPrice: z.coerce.number().optional(),
      maxPrice: z.coerce.number().optional(),
      level: z.enum(COURSE_LEVEL_VALUES as unknown as [string, ...string[]]).optional(),
      category: z.string().refine(isValidId, "Invalid category ID").optional(),
      minRating: z.coerce.number().optional(),
      sort: z.string().default("relevance"),
    })

    const {
      q: rawQuery,
      page,
      limit,
      minPrice,
      maxPrice,
      level,
      category,
      minRating,
      sort,
    } = parseOrThrow(SearchCoursesSchema, { ...req.body, ...req.query })

    const skip = (page - 1) * limit

    // Typed explicitly rather than inferred from the initialiser: inference
    // would fix the shape at `{ status, deletedAt }` and reject every
    // conditional field added below.
    const baseFilter: CourseSearchFilter = {
      status: "Published",
      deletedAt: null,
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      baseFilter.price = {}
      if (minPrice !== undefined) baseFilter.price.$gte = minPrice
      if (maxPrice !== undefined) baseFilter.price.$lte = maxPrice
    }

    if (level) {
      baseFilter.level = level as CourseLevel
    }

    if (category) {
      baseFilter.category = category
    }

    const wantsRatingFilter = minRating !== undefined && minRating > 0

    // $text requires the index above to exist — if it hasn't been created
    // yet (fresh DB, ensure-indexes.js not run), Mongo throws rather than
    // silently ignoring it. That's the signal to fall back to regex.
    let courses
    let total
    let usedTextIndex = true

    try {
      courses = await runSearch({ mode: "text", rawQuery, baseFilter, sort, wantsRatingFilter, minRating: minRating ?? Number.NaN, skip, limit })
      total = await countSearch({ mode: "text", rawQuery, baseFilter, wantsRatingFilter, minRating: minRating ?? Number.NaN })
    } catch {
      usedTextIndex = false
      courses = await runSearch({ mode: "regex", rawQuery, baseFilter, sort, wantsRatingFilter, minRating: minRating ?? Number.NaN, skip, limit })
      total = await countSearch({ mode: "regex", rawQuery, baseFilter, wantsRatingFilter, minRating: minRating ?? Number.NaN })
    }

    await emitEvent(EVENT_VERBS.SEARCH_PERFORMED, {
      context: { query: rawQuery, resultCount: total, page, usedTextIndex },
    })

    return res.status(200).json({
      success: true,
      data: courses,
      query: rawQuery,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    return fail(res, error, "searchCourses", "Search is temporarily unavailable. Please try again.")
  }
}

function buildRegexMatch(rawQuery: string): FilterQuery<unknown> {
  // Escape regex metacharacters so a user typing "c++" cannot break the query.
  const safe = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const rx = new RegExp(safe, "i")
  return {
    $or: [
      { courseName: rx },
      { courseDescription: rx },
      { whatYouWillLearn: rx },
      { tag: rx },
    ],
  }
}

const SORT_STAGES = {
  newest: { createdAt: -1 },
  "price-asc": { price: 1 },
  "price-desc": { price: -1 },
  rating: { avgRating: -1 },
} as const satisfies Record<string, Record<string, 1 | -1>>

type SortKey = keyof typeof SORT_STAGES

interface PipelineOptions {
  /** Omitted by the count pass, which must not paginate. */
  mode: "text" | "regex"
  rawQuery: string
  baseFilter: CourseSearchFilter
  sort?: string
  wantsRatingFilter: boolean
  minRating: number
  skip?: number
  limit?: number
}

/**
 * Rating needs an aggregation ($lookup into RatingAndReview) because
 * Course only stores an array of review ids, not embedded ratings — a
 * plain .find() can filter/sort on stored fields but not a computed
 * average. Every search request goes through this same pipeline shape
 * (text and regex modes only differ in the $match stage) so filtering,
 * sorting, and pagination stay consistent regardless of which matched.
 */
function buildPipeline({ mode, rawQuery, baseFilter, sort, wantsRatingFilter, minRating, skip, limit }: PipelineOptions): PipelineStage[] {
  const matchStage: FilterQuery<unknown> = { ...baseFilter }
  if (mode === "text") {
    matchStage.$text = { $search: rawQuery }
  } else {
    Object.assign(matchStage, buildRegexMatch(rawQuery))
  }

  const pipeline: PipelineStage[] = [{ $match: matchStage }]

  if (mode === "text" && sort === "relevance") {
    pipeline.push({ $addFields: { score: { $meta: "textScore" } } })
  }

  pipeline.push(
    {
      $lookup: {
        from: "ratingandreviews",
        localField: "ratingAndReviews",
        foreignField: "_id",
        as: "ratingDocs",
      },
    },
    { $addFields: { avgRating: { $ifNull: [{ $avg: "$ratingDocs.rating" }, 0] } } }
  )

  if (wantsRatingFilter) {
    pipeline.push({ $match: { avgRating: { $gte: minRating } } })
  }

  if (sort === "relevance" && mode === "text") {
    pipeline.push({ $sort: { score: -1 } })
  } else {
    pipeline.push({
      $sort: SORT_STAGES[sort as SortKey] ?? SORT_STAGES.newest,
    })
  }

  if (skip !== undefined) pipeline.push({ $skip: skip })
  if (limit !== undefined) pipeline.push({ $limit: limit })

  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "instructor",
        foreignField: "_id",
        as: "instructor",
        pipeline: [{ $project: { firstName: 1, lastName: 1 } }],
      },
    },
    { $unwind: { path: "$instructor", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        courseName: 1,
        courseDescription: 1,
        price: 1,
        thumbnail: 1,
        tag: 1,
        level: 1,
        studentsEnrolled: 1,
        instructor: 1,
        avgRating: 1,
        // Course_Card computes its own average from this shape
        // ({rating} objects) via GetAvgRating — keeping the same field
        // name and shape here means it renders unchanged for search
        // results, same as it already does for catalog/getAllCourses.
        ratingAndReviews: "$ratingDocs",
      },
    }
  )

  return pipeline
}

async function runSearch(args: PipelineOptions) {
  return Course.aggregate(buildPipeline(args))
}

async function countSearch(args: PipelineOptions) {
  const pipeline = buildPipeline({ ...args, skip: undefined, limit: undefined })
  // Drop the $skip/$limit-adjacent projection/sort stages that don't matter
  // for a count and replace the tail with $count.
  const countPipeline = [...pipeline, { $count: "total" }]
  const result = await Course.aggregate(countPipeline)
  return result[0]?.total ?? 0
}

/**
 * Deep-clones a course as a new Draft — new Section/SubSection documents,
 * but pointing at the SAME Cloudinary videoUrl/thumbnail rather than
 * re-uploading media, since the bytes haven't changed. studentsEnrolled,
 * ratingAndReviews, and status are deliberately NOT copied: a duplicate is
 * a fresh course with no students or reviews yet, always starting as a Draft
 * regardless of the source course's status.
 */
export const duplicateCourse = async (req: AuthedRequest, res: Response) => {
  try {
    const { courseId } = parseOrThrow(CourseIdSchema, req.body)
    const course = await Course.findOne({ _id: courseId, instructor: req.user.id }).populate({
      path: "courseContent",
      populate: { path: "subSection" },
    })
    if (!course) {
      return res.status(403).json({ success: false, message: "Not authorized to duplicate this course" })
    }

    const newSectionIds = []
    for (const section of course.courseContent) {
      const newSubSectionIds = []
      for (const sub of section.subSection) {
        const newSub = await SubSection.create({
          title: sub.title,
          timeDuration: sub.timeDuration,
          description: sub.description,
          videoUrl: sub.videoUrl,
          order: sub.order,
          freePreview: sub.freePreview,
        })
        newSubSectionIds.push(newSub._id)
      }
      const newSection = await Section.create({
        sectionName: section.sectionName,
        subSection: newSubSectionIds,
        order: section.order,
      })
      newSectionIds.push(newSection._id)
    }

    const newCourse = await Course.create({
      courseName: `${course.courseName} (Copy)`,
      courseDescription: course.courseDescription,
      instructor: req.user.id,
      whatYouWillLearn: course.whatYouWillLearn,
      courseContent: newSectionIds,
      price: course.price,
      thumbnail: course.thumbnail,
      tag: course.tag,
      category: course.category,
      instructions: course.instructions,
      level: course.level,
      language: course.language,
      status: "Draft",
    })

    await User.findByIdAndUpdate(req.user.id, { $push: { courses: newCourse._id } })
    if (newCourse.category) {
      await Category.findByIdAndUpdate(newCourse.category, { $push: { courses: newCourse._id } })
    }

    await recordAudit({
      actor: req.user.id,
      action: "course.duplicate",
      targetType: "Course",
      targetId: newCourse._id,
      details: { sourceCourseId: courseId },
    })

    return res.status(201).json({ success: true, data: newCourse })
  } catch (error) {
    return fail(res, error, "duplicateCourse", "Could not duplicate course")
  }
}
