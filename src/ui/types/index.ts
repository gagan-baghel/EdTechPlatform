/**
 * Client-side view of the API's data.
 *
 * These reuse the shared domain entities rather than redeclaring them, but
 * they model what the browser actually receives: ids are strings, dates have
 * been through JSON, and reference fields arrive populated on the endpoints
 * that populate them.
 */
import type {
  Category,
  Course,
  CourseProgress,
  Profile,
  RatingAndReview,
  Section,
  SubSection,
  User,
} from "@/types/domain"

/** A user as the profile endpoints return it: `additionalDetails` resolved. */
export interface AuthUser extends Omit<User, "additionalDetails"> {
  additionalDetails: Profile
}

/** A lecture inside the curriculum tree. */
export type CourseSubSection = SubSection

/** A section with its lectures resolved — how every course view receives it. */
export interface CourseSection extends Omit<Section, "subSection"> {
  subSection: CourseSubSection[]
}

/** A course with the relations the detail and player screens rely on. */
export interface CourseDetail
  extends Omit<
    Course,
    "courseContent" | "instructor" | "ratingAndReviews" | "category"
  > {
  courseContent: CourseSection[]
  instructor: AuthUser
  ratingAndReviews: PopulatedReview[]
  category: Category | null
}

/** A course as it appears in a list or card, where relations stay as ids. */
export type CourseListItem = Course

export interface PopulatedReview extends Omit<RatingAndReview, "user"> {
  user: Pick<User, "_id" | "firstName" | "lastName" | "userImage">
}

export type { CourseProgress }

/** The wizard draft persisted to localStorage by courseSlice. */
export interface CourseWizardDraft {
  step: number
  course: CourseDetail | null
  editCourse: boolean
}

/**
 * The admin list endpoints answer with the payload alongside top-level
 * pagination (`{ success, data, page, limit, total }`) rather than nesting
 * pagination inside `data`. Typing that shape is what lets callers read
 * `result.data` after a success check instead of reaching into `unknown`.
 */
export interface PagedBody<TItem> {
  success: true
  data: TItem[]
  page: number
  limit: number
  total: number
}

/** A success body whose payload sits at `data`, with no pagination. */
export interface DataBody<TData> {
  success: true
  data: TData
}

/**
 * A course as the "Enrolled courses" screen receives it: curriculum resolved,
 * plus the per-user progress fields the endpoint merges in.
 */
export interface EnrolledCourse extends Omit<Course, "courseContent" | "category"> {
  courseContent: CourseSection[]
  category?: Category | null
  progressPercentage?: number
  totalDuration?: string
  lastWatchedSubSection?: string | null
}
