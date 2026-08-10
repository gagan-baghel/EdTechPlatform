import { Schema } from "mongoose"

import type { Course as CourseEntity } from "@/types/domain"
import { COURSE_LEVEL_VALUES, COURSE_STATUS_VALUES } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

const coursesSchema = new Schema<SchemaOf<CourseEntity<ObjectId>>>({
	courseName: { type: String },
	courseDescription: { type: String },
	instructor: {
		type: Schema.Types.ObjectId,
		required: true,
		ref: "User",
	},
	whatYouWillLearn: {
		type: String,
	},
	courseContent: [
		{
			type: Schema.Types.ObjectId,
			ref: "Section",
		},
	],
	ratingAndReviews: [
		{
			type: Schema.Types.ObjectId,
			ref: "RatingAndReview",
		},
	],
	price: {
		type: Number,
	},
	thumbnail: {
		type: String,
	},
	tag: {
		type: [String],
		required: true,
	},
	category: {
		type: Schema.Types.ObjectId,
		// required: true,
		ref: "Category",
	},
	studentsEnrolled: [
		{
			type: Schema.Types.ObjectId,
			required: true,
			ref: "User",
		},
	],
	instructions: {
		type: [String],
	},
	status: {
		type: String,
		enum: COURSE_STATUS_VALUES,
	},
	// Content-model v2: previously absent metadata (audit: "no level/language/
	// duration/prerequisites"). Duration stays computed from subsection
	// timeDuration rather than stored here — storing it would mean keeping it
	// in sync on every lecture add/edit/delete, a second source of truth for
	// data that's cheap to derive on read.
	level: {
		type: String,
		enum: COURSE_LEVEL_VALUES,
	},
	language: {
		type: String,
		default: "English",
	},
	// Soft delete: deleteCourse now sets this instead of cascading a hard
	// delete through sections/subsections/progress/reviews. Public course
	// listing/detail queries filter deletedAt: null explicitly (see Course.ts
	// controller) rather than via a global pre-find hook, which would
	// silently change the behavior of every existing query in this file,
	// including admin lookups that need to see deleted courses.
	deletedAt: {
		type: Date,
		default: null,
	},
	// Scheduled publishing — set instead of flipping status straight to
	// Published. A Vercel Cron job (see /api/cron/publish-scheduled and
	// vercel.json) checks this on a schedule and does the actual
	// Draft->Published flip; this field alone does not publish anything.
	scheduledPublishAt: {
		type: Date,
		default: null,
	},
	createdAt: {
		type:Date,
		default:Date.now
	},
}, { timestamps: { createdAt: false, updatedAt: true } });

// searchCourses previously claimed to use this ("Uses a Mongo text index
// when available...") while no such index existed anywhere, so it always
// ran the unanchored regex fallback — an O(n) collection scan on every
// keystroke-triggered search that can't use any index. This makes the
// claim true. courseName is weighted highest since a title match is the
// strongest relevance signal; index creation is async in the background
// and searchCourses falls back to regex until it's ready (see ensure-
// indexes.js pattern — autoIndex is off, so this needs the same manual
// creation step in production).
coursesSchema.index(
	{ courseName: "text", courseDescription: "text", whatYouWillLearn: "text", tag: "text" },
	{ weights: { courseName: 10, tag: 5, courseDescription: 1, whatYouWillLearn: 1 }, name: "course_text_search" }
)

// Catalogue reads are always "published, not deleted, in this category" —
// without this they were collection scans filtered in memory.
coursesSchema.index({ status: 1, deletedAt: 1, category: 1 })
// Backs the instructor's own course list.
coursesSchema.index({ instructor: 1, deletedAt: 1 })

export const Course = defineModel("Course", coursesSchema)
export default Course
