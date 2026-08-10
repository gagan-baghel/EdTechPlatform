import type { Request, Response } from "express"
import { isDuplicateKeyError } from "../lib/AppError"
import { fail } from "../lib/respond"
import type { AuthedRequest } from "../lib/http"
import RatingAndReview from "../models/RatingAndReview"
import Course from "../models/Course"
import { notify } from "../utils/notify"

// Create a new rating and review
export const createRating = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user.id
    const { rating, review, courseId } = req.body
    if (!courseId || rating === undefined || rating === null || !review) {
      return res.status(400).json({
        success: false,
        message: "courseId, rating, and review are required",
      })
    }
    if (Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      })
    }

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
export const getAllRatingReview = async (req: Request, res: Response) => {
  try {
    const allReviews = await RatingAndReview.find({})
      .sort({ rating: "desc" })
      .populate({
        path: "user",
        select: "firstName lastName email userImage", // Specify the fields you want to populate from the "Profile" model
      })
      .populate({
        path: "course",
        select: "courseName", //Specify the fields you want to populate from the "Course" model
      })
      .exec()

    res.status(200).json({
      success: true,
      data: allReviews,
    })
  } catch (error) {
    return fail(res, error, "getAllRatingReview", "Failed to retrieve the rating and review for the course")}
}
