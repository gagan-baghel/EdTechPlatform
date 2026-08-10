interface CourseSummary {
  _id: unknown
  price?: number
  studentsEnrolled?: unknown[]
}

import type { Request, Response } from "express"
import { fail } from "../lib/respond"
import Category from "../models/Category"
function getRandomInt(max: number): number {
    return Math.floor(Math.random() * max)
  }

export const createCategory = async (req: Request, res: Response) => {
	try {
		const { name, description } = req.body;
		if (!name) {
			return res
				.status(400)
				.json({ success: false, message: "All fields are required" });
		}
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

export const categoryPageDetails = async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.body
      if (!categoryId) {
        return res.status(400).json({
          success: false,
          message: "categoryId is required",
        })
      }
      // Get courses for the specified category
      const selectedCategory = await Category.findById(categoryId)
        .populate({
          path: "courses",
          match: { status: "Published", deletedAt: null },
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
      })
      let differentCategory = null
      if (categoriesExceptSelected.length > 0) {
        differentCategory = await Category.findOne(
          categoriesExceptSelected[getRandomInt(categoriesExceptSelected.length)]
            ._id
        )
          .populate({
            path: "courses",
            match: { status: "Published", deletedAt: null },
          })
          .exec()
      }
      // Get top-selling courses across all categories. This route has no
      // auth guard — scope the nested instructor populate or an
      // unauthenticated caller gets every instructor's password hash and
      // live reset token along for free.
      const allCategories = await Category.find()
        .populate({
          path: "courses",
          match: { status: "Published", deletedAt: null },
          populate: {
            path: "instructor",
            select: "firstName lastName userImage",
          },
        })
        .exec()
      const allCourses = allCategories.flatMap(
          (category: { courses: CourseSummary[] }) => category.courses
        )
      const mostSellingCourses = allCourses
        .sort(
            (a: CourseSummary, b: CourseSummary) =>
              (b.studentsEnrolled?.length || 0) - (a.studentsEnrolled?.length || 0)
          )
        .slice(0, 10)
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
