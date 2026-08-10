import { queryNumber } from "../lib/request"
import type { Request, Response } from "express"
import mongoose from "mongoose"
import Payment from "../models/Payment"
import Course from "../models/Course"

/**
 * Deterministic co-purchase — "students who bought X also bought Y" — via
 * a plain aggregation over Payment.courses, no ML/embeddings. The plan is
 * explicit that this beats an AI recommender here: there's no usage data
 * yet to train one on, and co-purchase counts are free, auditable, and
 * available today.
 */
export const getCoursesBoughtTogether = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params
    const limit = Math.min(10, Math.max(1, queryNumber(req, "limit") ?? 4))

    const courseObjectId = new mongoose.Types.ObjectId(courseId)
    const results = await Payment.aggregate([
      { $match: { courses: courseObjectId } },
      { $unwind: "$courses" },
      { $match: { courses: { $ne: courseObjectId } } },
      { $group: { _id: "$courses", coPurchaseCount: { $sum: 1 } } },
      { $sort: { coPurchaseCount: -1 } },
      { $limit: limit },
    ])

    const courseIds = results.map((r) => r._id)
    const courses = await Course.find({ _id: { $in: courseIds }, status: "Published", deletedAt: null })
      .select("courseName thumbnail price ratingAndReviews")
      .lean()

    // Preserve co-purchase-count order — $in doesn't guarantee it.
    const order = new Map(courseIds.map((id, i) => [id.toString(), i]))
    courses.sort(
      (a: { _id: unknown }, b: { _id: unknown }) =>
        (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0)
    )

    return res.status(200).json({ success: true, data: courses })
  } catch (error) {
    console.error("getCoursesBoughtTogether failed", error)
    return res.status(500).json({ success: false, message: "Could not load recommendations" })
  }
}
