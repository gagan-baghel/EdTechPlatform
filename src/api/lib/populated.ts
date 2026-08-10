import type {
  Course,
  RatingAndReview,
  Section,
  SubSection,
  User,
} from "@/types/domain"
import type { ObjectId } from "./mongoose"

/**
 * The shapes `.populate()` actually produces.
 *
 * A ref field is an ObjectId until a populate swaps it for the document, and
 * that difference is invisible under `any` — which is why so many reads here
 * did `section.subSection.length` on what the schema says is an ObjectId[].
 * Passing one of these to `.populate<T>()` makes the result type match what
 * the query genuinely returns:
 *
 *   Course.findById(id).populate<CourseContentPopulate>({
 *     path: "courseContent",
 *     populate: { path: "subSection" },
 *   })
 */

export type PopulatedSection = Omit<Section<ObjectId>, "subSection"> & {
  subSection: SubSection<ObjectId>[]
}

/** `.populate({ path: "courseContent", populate: { path: "subSection" } })` */
export interface CourseContentPopulate {
  courseContent: PopulatedSection[]
}

/** `.populate("instructor")` */
export interface InstructorPopulate {
  instructor: User<ObjectId>
}

/** `.populate("ratingAndReviews")` */
export interface ReviewsPopulate {
  ratingAndReviews: RatingAndReview<ObjectId>[]
}

/** `.populate("courses")` on a User — enrolled or authored courses. */
export interface CoursesPopulate {
  courses: Course<ObjectId>[]
}

/** A user's enrolled courses with their full curriculum resolved. */
export interface CoursesWithContentPopulate {
  courses: (Omit<Course<ObjectId>, "courseContent"> & {
    courseContent: PopulatedSection[]
  })[]
}
