import { z } from "zod"
import type { Request, Response } from "express"
import { isDuplicateKeyError } from "../lib/AppError"
import { fail, parseOrThrow } from "../lib/respond"
import { objectId, paginationQuery, text, toSkip } from "../lib/schemas"
import type { AuthedRequest } from "../lib/http"
import RatingAndReview from "../models/RatingAndReview"
import Course from "../models/Course"
import { notify } from "../utils/notify"

const CreateRatingSchema = z.object({
  courseId: objectId("A valid course id is required"),
  rating: z.coerce.number().int().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  review: text({ max: 5000, label: "Review" }),
})

// Create a new rating and review
export const createRating = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user.id
    const { rating, review, courseId } = parseOrThrow(CreateRatingSchema, req.body)

    // Check if the user is enrolled in the course

    const courseDetails = await Course.findOne({
      _id: courseId,
      studentsEnrolled: { $elemMatch: { $eq: userId } },
    })

    if (!courseDetails) {
      return res.status(404).json({
        success: false,
        message: "Student is not enrolled in this course",
      })
    }

    // Check if the user has already reviewed the course
    const alreadyReviewed = await RatingAndReview.findOne({
      user: userId,
      course: courseId,
    })

    if (alreadyReviewed) {
      return res.status(403).json({
        success: false,
        message: "Course already reviewed by user",
      })
    }

    // The findOne check above is a friendly-message optimisation, not the
    // guarantee — two review submissions for the same {user, course} can
    // both pass it. The unique index is the real guarantee.
    let ratingReview
    try {
      ratingReview = await RatingAndReview.create({
        rating,
        review,
        course: courseId,
        user: userId,
      })
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return res.status(403).json({
          success: false,
          message: "Course already reviewed by user",
        })
      }
      throw error
    }

    // Add the rating and review to the course
    await Course.findByIdAndUpdate(courseId, {
      $push: {
        ratingAndReviews: ratingReview,
      },
    })

    await notify(courseDetails.instructor, {
      type: "new_review",
      title: `New ${rating}-star review on ${courseDetails.courseName}`,
      body: review,
      link: `/dashboard/instructor`,
    })

    return res.status(201).json({
      success: true,
      message: "Rating and review created successfully",
      ratingReview,
    })
  } catch (error) {
    return fail(res, error, "createRating", "Internal server error")}
}

// Get all rating and reviews
/**
 * Public review feed (the homepage carousel).
 *
 * Two problems, both from the same projection: it selected the reviewer's
 * `email` — publishing the email address of every reviewing student to any
 * anonymous visitor — and it was unbounded, returning the entire reviews
 * collection on every homepage render.
 */
export const getAllRatingReview = async (req: Request, res: Response) => {
  try {
    const { page, limit } = parseOrThrow(
      paginationQuery({ defaultLimit: 20, maxLimit: 50 }),
      req.query
    )
    const { skip } = toSkip({ page, limit })

    const [allReviews, total] = await Promise.all([
      RatingAndReview.find({})
        .sort({ rating: "desc", _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "user", select: "firstName lastName userImage" })
        .populate({ path: "course", select: "courseName" })
        .lean(),
      RatingAndReview.countDocuments({}),
    ])

    res.status(200).json({
      success: true,
      data: allReviews,
      page,
      limit,
      total,
    })
  } catch (error) {
    return fail(res, error, "getAllRatingReview", "Failed to retrieve the rating and review for the course")}
}
