import { z } from "zod"
import { fail, parseOrThrow } from "../lib/respond"
import { objectId } from "../lib/schemas"
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
    // `new mongoose.Types.ObjectId(courseId)` on an unvalidated param throws
    // a BSONError, which surfaced as a 500 on any malformed URL.
    const { courseId } = parseOrThrow(
      z.object({ courseId: objectId("A valid course id is required") }),
      req.params
    )
    const { limit } = parseOrThrow(
      z.object({ limit: z.coerce.number().int().min(1).max(10).catch(4) }),
      req.query
    )

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
    return fail(res, error, "getCoursesBoughtTogether", "Could not load recommendations")
  }
}
