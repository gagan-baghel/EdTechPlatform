import { z } from "zod"
import { containsId } from "../lib/ids"
import type { Response } from "express"
import { fail, parseOrThrow } from "../lib/respond"
import { objectId, text } from "../lib/schemas"
import type { AuthedRequest } from "../lib/http"
import Section from "../models/Section"
import Course from "../models/Course"
import SubSection from "../models/SubSection"

const CreateSectionSchema = z.object({
	sectionName: text({ max: 200, label: "Section name" }),
	courseId: objectId("A valid course id is required"),
})

const UpdateSectionSchema = CreateSectionSchema.extend({
	sectionId: objectId("A valid section id is required"),
})

const ReorderSectionsSchema = z.object({
	courseId: objectId("A valid course id is required"),
	orderedSectionIds: z.array(objectId()).min(1, "Missing required properties"),
})

const DeleteSectionSchema = z.object({
	sectionId: objectId("A valid section id is required"),
	courseId: objectId("A valid course id is required"),
})

// CREATE a new section
export const createSection = async (req: AuthedRequest, res: Response) => {
	try {
		// Extract the required properties from the request body
		const { sectionName, courseId } = parseOrThrow(CreateSectionSchema, req.body);

		// Verify course ownership
		const course = await Course.findOne({
			_id: courseId,
			instructor: req.user.id,
		})
		if (!course) {
			return res.status(403).json({
				success: false,
				message: "Not authorized to modify this course",
			})
		}

		// Create a new section with the given name. order is set from the
		// course's current section count so sections stay in creation order
		// by default — same effect as the old array-position-only ordering,
		// but now an explicit, independently-updatable value.
		const newSection = await Section.create({
			sectionName,
			order: course.courseContent.length,
		});

		// Add the new section to the course's content array
		const updatedCourse = await Course.findByIdAndUpdate(
			courseId,
			{
				$push: {
					courseContent: newSection._id,
				},
			},
			{ new: true }
		)
			.populate({
				path: "courseContent",
				options: { sort: { order: 1 } },
				populate: {
					path: "subSection",
					options: { sort: { order: 1 } },
				},
			})
			.exec();

		// Return the updated course object in the response
		res.status(200).json({
			success: true,
			message: "Section created successfully",
			updatedCourse,
		});
	} catch (error) {
		// Handle errors
		fail(res, error, "createSection", "Internal server error")
	}
};

// UPDATE a section
export const updateSection = async (req: AuthedRequest, res: Response) => {
	try {
		const { sectionName, sectionId, courseId } = parseOrThrow(UpdateSectionSchema, req.body);
		const courseOwner = await Course.findOne({
			_id: courseId,
			instructor: req.user.id,
			courseContent: sectionId,
		})
		if (!courseOwner) {
			return res.status(403).json({
				success: false,
				message: "Not authorized to modify this course",
			})
		}
		const section = await Section.findByIdAndUpdate(
			sectionId,
			{ sectionName },
			{ new: true }
		);

		const course = await Course.findById(courseId)
		.populate({
			path:"courseContent",
			options: { sort: { order: 1 } },
			populate:{
				path:"subSection",
				options: { sort: { order: 1 } },
			},
		})
		.exec();

		res.status(200).json({
			success: true,
			message: section ? "Section updated" : "Section not found",
			data: course,
		});
	} catch (error) {
    return fail(res, error, "updateSection", "Internal server error")
  }
};

// REORDER sections — persists a new order for the sections in a course.
// Takes the array of section ids in their new order rather than explicit
// {id, order} pairs; the index in the array IS the new order value, which
// matches how a drag-drop UI naturally produces its result (a reordered
// list of ids) and avoids the client having to compute order numbers itself.
export const reorderSections = async (req: AuthedRequest, res: Response) => {
	try {
		const { courseId, orderedSectionIds } = parseOrThrow(ReorderSectionsSchema, req.body);

		const course = await Course.findOne({
			_id: courseId,
			instructor: req.user.id,
		})
		if (!course) {
			return res.status(403).json({
				success: false,
				message: "Not authorized to modify this course",
			})
		}

		// Every id must actually belong to this course — otherwise an
		// instructor could reorder (and thus prove membership of) another
		// course's section ids by id-guessing.
		const belongsToCourse = orderedSectionIds.every((id) =>
			containsId(course.courseContent, id)
		)
		if (
			!belongsToCourse ||
			orderedSectionIds.length !== course.courseContent.length
		) {
			return res.status(400).json({
				success: false,
				message: "orderedSectionIds must be exactly the course's existing sections",
			})
		}

		await Promise.all(
			orderedSectionIds.map((sectionId, index) =>
				Section.updateOne({ _id: sectionId }, { order: index })
			)
		)

		const updatedCourse = await Course.findById(courseId)
			.populate({
				path: "courseContent",
				options: { sort: { order: 1 } },
				populate: { path: "subSection", options: { sort: { order: 1 } } },
			})
			.exec()

		res.status(200).json({
			success: true,
			message: "Sections reordered",
			updatedCourse,
		})
	} catch (error) {
		fail(res, error, "reorderSections", "Internal server error")}
};

// DELETE a section
export const deleteSection = async (req: AuthedRequest, res: Response) => {
	try {

		const { sectionId, courseId } = parseOrThrow(DeleteSectionSchema, req.body);
		const courseOwner = await Course.findOne({
			_id: courseId,
			instructor: req.user.id,
			courseContent: sectionId,
		})
		if (!courseOwner) {
			return res.status(403).json({
				success: false,
				message: "Not authorized to modify this course",
			})
		}
		await Course.findByIdAndUpdate(courseId, {
			$pull: {
				courseContent: sectionId,
			}
		})
		const section = await Section.findById(sectionId);
		if(!section) {
			return res.status(404).json({
				success:false,
				message:"Section not Found",
			})
		}

		//delete sub section
		await SubSection.deleteMany({_id: {$in: section.subSection}});

		await Section.findByIdAndDelete(sectionId);

		//find the updated course and return 
		const course = await Course.findById(courseId).populate({
			path:"courseContent",
			options: { sort: { order: 1 } },
			populate: {
				path: "subSection",
				options: { sort: { order: 1 } },
			}
		})
		.exec();

		res.status(200).json({
			success:true,
			message:"Section deleted",
			data:course
		});
	} catch (error) {
    return fail(res, error, "deleteSection", "Internal server error")
  }
};   
