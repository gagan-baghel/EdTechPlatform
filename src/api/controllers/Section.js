const Section = require("../models/Section");
const Course = require("../models/Course");
const SubSection = require("../models/SubSection");
// CREATE a new section
exports.createSection = async (req, res) => {
	try {
		// Extract the required properties from the request body
		const { sectionName, courseId } = req.body;

		// Validate the input
		if (!sectionName || !courseId) {
			return res.status(400).json({
				success: false,
				message: "Missing required properties",
			});
		}

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
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// UPDATE a section
exports.updateSection = async (req, res) => {
	try {
		const { sectionName, sectionId,courseId } = req.body;
		if (!sectionName || !sectionId || !courseId) {
			return res.status(400).json({
				success: false,
				message: "Missing required properties",
			})
		}
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
			message: section,
			data:course,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};

// REORDER sections — persists a new order for the sections in a course.
// Takes the array of section ids in their new order rather than explicit
// {id, order} pairs; the index in the array IS the new order value, which
// matches how a drag-drop UI naturally produces its result (a reordered
// list of ids) and avoids the client having to compute order numbers itself.
exports.reorderSections = async (req, res) => {
	try {
		const { courseId, orderedSectionIds } = req.body;
		if (!courseId || !Array.isArray(orderedSectionIds) || orderedSectionIds.length === 0) {
			return res.status(400).json({
				success: false,
				message: "Missing required properties",
			})
		}

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
			course.courseContent.some((existingId) => existingId.toString() === id)
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
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		})
	}
};

// DELETE a section
exports.deleteSection = async (req, res) => {
	try {

		const { sectionId, courseId }  = req.body;
		if (!sectionId || !courseId) {
			return res.status(400).json({
				success: false,
				message: "Missing required properties",
			})
		}
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
		res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};   
