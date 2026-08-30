import type { Request, Response } from "express"
import { z } from "zod"
import { fail, parseOrThrow } from "../lib/respond"
import { objectId, text } from "../lib/schemas"
import Category from "../models/Category"
import Course from "../models/Course"
function getRandomInt(max: number): number {
    return Math.floor(Math.random() * max)
  }

const CreateCategorySchema = z.object({
	name: text({ max: 100, label: "Category name" }),
	description: text({ max: 1000, label: "Description" }).optional(),
});

export const createCategory = async (req: Request, res: Response) => {
	try {
		const { name, description } = parseOrThrow(CreateCategorySchema, req.body);
		await Category.create({
			name: name,
			description: description,
		});
		return res.status(200).json({
			success: true,
			message: "Categorys Created Successfully",
		});
		} catch (error) {
			return fail(res, error, "createCategory")
		}
};

export const showAllCategories = async (req: Request, res: Response) => {
	try {
       
		const allCategorys = await Category.find({});
		res.status(200).json({
			success: true,
			data: allCategorys,
		});
	} catch (error) {
		return fail(res, error, "showAllCategories")
	}
};

//categoryPageDetails 

const CategoryPageDetailsSchema = z.object({
  categoryId: objectId("A valid category id is required"),
});

/**
 * Top courses by enrolment, computed in the database.
 *
 * This used to load EVERY category, populate EVERY published course inside
 * each one with its instructor, flatten the lot into one array in Node, sort
 * it, and keep ten — on every single category page view. That is the entire
 * course catalogue read into memory to answer a top-10 question the database
 * can answer with an index-backed sort and a $limit.
 */
async function getMostSellingCourses(limit = 10) {
  return Course.aggregate([
    { $match: { status: "Published", deletedAt: null } },
    { $addFields: { enrolledCount: { $size: { $ifNull: ["$studentsEnrolled", []] } } } },
    { $sort: { enrolledCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "instructor",
        foreignField: "_id",
        as: "instructor",
        // Projected inside the lookup: this route is unauthenticated, and an
        // unscoped instructor populate hands out password hashes and live
        // password-reset tokens.
        pipeline: [{ $project: { firstName: 1, lastName: 1, userImage: 1 } }],
      },
    },
    { $unwind: { path: "$instructor", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        courseName: 1,
        courseDescription: 1,
        price: 1,
        thumbnail: 1,
        instructor: 1,
        ratingAndReviews: 1,
        studentsEnrolled: 1,
      },
    },
  ])
}

export const categoryPageDetails = async (req: Request, res: Response) => {
    try {
      const { categoryId } = parseOrThrow(CategoryPageDetailsSchema, req.body);
      // Get courses for the specified category
      const selectedCategory = await Category.findById(categoryId)
        .populate({
          path: "courses",
          match: { status: "Published", deletedAt: null },
          // Bounded: a popular category is otherwise an unbounded page payload
          // that grows with every course added to it.
          options: { limit: 60 },
          populate: "ratingAndReviews",
        })
        .exec()
  
      // Handle the case when the category is not found
      if (!selectedCategory) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" })
      }
      // Handle the case when there are no courses
      if (selectedCategory.courses.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            selectedCategory,
            differentCategory: null,
            mostSellingCourses: [],
          },
        })
      }
  
      // Get courses for other categories
      const categoriesExceptSelected = await Category.find({
        _id: { $ne: categoryId },
      }).select("_id")
      let differentCategory = null
      if (categoriesExceptSelected.length > 0) {
        differentCategory = await Category.findOne(
          categoriesExceptSelected[getRandomInt(categoriesExceptSelected.length)]
            ._id
        )
          .populate({
            path: "courses",
            match: { status: "Published", deletedAt: null },
            options: { limit: 12 },
          })
          .exec()
      }
      const mostSellingCourses = await getMostSellingCourses()

      res.status(200).json({
        success: true,
        data: {
          selectedCategory,
          differentCategory,
          mostSellingCourses,
        },
      })
    } catch (error) {
      return fail(res, error, "categoryPageDetails", "Internal server error")}
}
