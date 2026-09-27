/**
 * The single definition of every domain entity in the platform.
 *
 * Each interface is generic over its id representation, because the same
 * entity is genuinely two shapes at runtime: on the server a reference is a
 * `Types.ObjectId`, and by the time it reaches the browser it is a string.
 * Parameterising instead of duplicating means the field list — the part that
 * actually drifts — is written once:
 *
 *   server:  User<Types.ObjectId>
 *   client:  User                  (id type defaults to string)
 *
 * The `*_VALUES` arrays are the source of truth for the string unions AND for
 * the Mongoose `enum` / Zod validators, so a schema and its type can't drift
 * apart the way two hand-written copies would.
 */

import type { Populated } from "./util"

/* ------------------------------------------------------------------ *
 * Shared primitives
 * ------------------------------------------------------------------ */

/** Default id representation: what the client actually receives. */
export type IdLike = string

export interface Timestamped {
  createdAt: Date
  updatedAt: Date
}

/* ------------------------------------------------------------------ *
 * Enumerations
 * ------------------------------------------------------------------ */

export const ACCOUNT_TYPE_VALUES = ["Admin", "Student", "Instructor"] as const
export type AccountType = (typeof ACCOUNT_TYPE_VALUES)[number]

/** Account types a public signup is allowed to request — never "Admin". */
export const SELF_SERVICE_ACCOUNT_TYPES = ["Student", "Instructor"] as const
export type SelfServiceAccountType = (typeof SELF_SERVICE_ACCOUNT_TYPES)[number]

export const COURSE_STATUS_VALUES = ["Draft", "Published"] as const
export type CourseStatus = (typeof COURSE_STATUS_VALUES)[number]

export const COURSE_LEVEL_VALUES = ["Beginner", "Intermediate", "Advanced"] as const
export type CourseLevel = (typeof COURSE_LEVEL_VALUES)[number]

export const ORDER_STATUS_VALUES = ["created", "paid", "refunded"] as const
export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number]

export const PAYOUT_STATUS_VALUES = ["pending", "paid", "failed"] as const
export type PayoutStatus = (typeof PAYOUT_STATUS_VALUES)[number]

export const KYC_STATUS_VALUES = [
  "not_submitted",
  "pending",
  "verified",
  "rejected",
] as const
export type KycStatus = (typeof KYC_STATUS_VALUES)[number]

export const REFUND_REASON_VALUES = [
  "requested_by_customer",
  "completion_deadline_missed",
  "admin_discretion",
] as const
export type RefundReason = (typeof REFUND_REASON_VALUES)[number]

export const REFUND_STATUS_VALUES = ["processed", "failed"] as const
export type RefundStatus = (typeof REFUND_STATUS_VALUES)[number]

export const COUPON_TYPE_VALUES = ["percent", "flat"] as const
export type CouponType = (typeof COUPON_TYPE_VALUES)[number]

export const TRANSCRIPT_STATUS_VALUES = [
  "none",
  "pending",
  "processing",
  "done",
  "failed",
] as const
export type TranscriptStatus = (typeof TRANSCRIPT_STATUS_VALUES)[number]

export const LIVE_SESSION_STATUS_VALUES = ["scheduled", "cancelled"] as const
export type LiveSessionStatus = (typeof LIVE_SESSION_STATUS_VALUES)[number]

export const SUBSCRIPTION_INTERVAL_VALUES = ["monthly", "yearly"] as const
export type SubscriptionInterval = (typeof SUBSCRIPTION_INTERVAL_VALUES)[number]

export const SUBSCRIPTION_STATUS_VALUES = ["created", "active", "cancelled"] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS_VALUES)[number]

export const REFERRAL_STATUS_VALUES = ["pending", "paid"] as const
export type ReferralStatus = (typeof REFERRAL_STATUS_VALUES)[number]

export const AI_INTERACTION_TYPE_VALUES = [
  "tutor",
  "copilot_outline",
  "quiz_generation",
  "assistant",
] as const
export type AiInteractionType = (typeof AI_INTERACTION_TYPE_VALUES)[number]

export const LEARNING_GOAL_VALUES = [
  "career_switch",
  "skill_upgrade",
  "certification",
  "hobby",
] as const
export type LearningGoal = (typeof LEARNING_GOAL_VALUES)[number]

export const THEME_VALUES = ["dark", "light"] as const
export type Theme = (typeof THEME_VALUES)[number]

export const LOCALE_VALUES = ["en", "hi"] as const
export type Locale = (typeof LOCALE_VALUES)[number]

/* ------------------------------------------------------------------ *
 * Identity
 * ------------------------------------------------------------------ */

export interface Profile<Id = IdLike> {
  _id: Id
  gender: string | null
  dateOfBirth: string | null
  about: string | null
  contactNumber: number | null
  learningGoal: LearningGoal | null
  weeklyGoalMinutes: number
  defaultPlaybackSpeed: number
  autoplayNext: boolean
  theme: Theme
  locale: Locale
  timezone: string | null
  /** Opt-out for appearing by name on course leaderboards. Rank is still computed. */
  showOnLeaderboard: boolean
}

/**
 * NOTE `password` and `token` are `select: false` in the schema, so they are
 * absent from a default read. Declaring them optional is what makes that
 * true in the type system — code that wants either must `.select("+password")`
 * and still narrow, which is the behaviour we want at every call site.
 */
export interface User<Id = IdLike> {
  _id: Id
  firstName: string
  lastName: string
  email: string
  password?: string
  token?: string | null
  resetPasswordExpires?: Date | null
  active: boolean
  accountType: AccountType
  additionalDetails: Id
  approved: boolean
  courses: Id[]
  userImage: string
  courseProgress: Id[]
  savedCourses: Id[]
  /**
   * Per-event-type email opt-out, modelled as opt-out so a user who never
   * visits settings still receives enrolment/payment mail. Stored as a
   * Mongoose Map server-side (see the model, which overrides this field);
   * this is the JSON shape every reader outside the model sees.
   */
  notificationEmailPreferences: Record<string, boolean>
  onboarded: boolean
  referralCode: string | null
  referredBy: Id | null
}

/** A user with `additionalDetails` resolved — the shape the profile screens use. */
export type UserWithProfile<Id = IdLike> = Populated<
  User<Id>,
  "additionalDetails",
  Profile<Id>
>

export interface Session<Id = IdLike> extends Timestamped {
  _id: Id
  user: Id
  jti: string
  userAgent: string
  ip: string
  lastSeenAt: Date
  revoked: boolean
}

export interface Otp<Id = IdLike> {
  _id: Id
  email: string
  otp: number
  attempts: number
  createdAt: Date
}

/* ------------------------------------------------------------------ *
 * Catalogue
 * ------------------------------------------------------------------ */

export interface Category<Id = IdLike> {
  _id: Id
  name: string
  description?: string
  courses: Id[]
}

export interface Attachment {
  /** Subdocument id — Mongoose assigns one unless `_id: false` is set. */
  _id?: string
  name: string
  url: string
  publicId: string
}

export interface SubSection<Id = IdLike> {
  _id: Id
  title: string
  timeDuration: string
  description: string
  videoUrl: string
  /**
   * Cloudinary public_id for `videoUrl`. Stored so the asset can actually be
   * removed when the lecture is deleted — without it, every deleted lecture
   * left its video behind, billed forever and reachable by anyone who had the
   * URL. Optional because lectures created before this field existed have no
   * recorded id; those are skipped rather than derived from the URL.
   */
  videoPublicId?: string
  order: number
  freePreview: boolean
  attachments: Attachment[]
  transcript: string
  transcriptStatus: TranscriptStatus
}

export interface Section<Id = IdLike> {
  _id: Id
  sectionName: string
  subSection: Id[]
  order: number
}

export interface Course<Id = IdLike> {
  _id: Id
  courseName: string
  courseDescription: string
  instructor: Id
  whatYouWillLearn: string
  courseContent: Id[]
  ratingAndReviews: Id[]
  price: number
  thumbnail: string
  tag: string[]
  category: Id | null
  studentsEnrolled: Id[]
  instructions: string[]
  status: CourseStatus
  level?: CourseLevel
  language: string
  /** Soft delete. Public queries must filter `deletedAt: null` explicitly. */
  deletedAt: Date | null
  scheduledPublishAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface RatingAndReview<Id = IdLike> {
  _id: Id
  user: Id
  rating: number
  review: string
  course: Id
}

/* ------------------------------------------------------------------ *
 * Learning
 * ------------------------------------------------------------------ */

export interface WatchStateEntry<Id = IdLike> {
  subSection: Id
  positionSeconds: number
  updatedAt: Date
}

export interface CourseProgress<Id = IdLike> extends Timestamped {
  _id: Id
  courseID: Id
  userId: Id
  completedVideos: Id[]
  watchState: WatchStateEntry<Id>[]
  lastWatchedSubSection: Id | null
}

export interface Note<Id = IdLike> extends Timestamped {
  _id: Id
  user: Id
  course: Id
  subSection: Id
  timestampSeconds: number
  text: string
}

export interface Answer<Id = IdLike> extends Timestamped {
  _id: Id
  answeredBy: Id
  text: string
}

export interface Question<Id = IdLike> extends Timestamped {
  _id: Id
  course: Id
  subSection: Id
  askedBy: Id
  text: string
  answers: Answer<Id>[]
}

export interface QuizQuestion<Id = IdLike> {
  _id: Id
  questionText: string
  options: string[]
  /** Never serialised to a student — `getQuizForStudent` strips it. */
  correctOptionIndex: number
  explanation?: string
}

/** Exactly what a student is allowed to receive for a quiz question. */
export type StudentQuizQuestion<Id = IdLike> = Omit<
  QuizQuestion<Id>,
  "correctOptionIndex" | "explanation"
>

export interface Quiz<Id = IdLike> extends Timestamped {
  _id: Id
  course: Id
  subSection: Id | null
  title: string
  questions: QuizQuestion<Id>[]
  passingScorePercent: number
  createdBy: Id
  published: boolean
}

export type StudentQuiz<Id = IdLike> = Omit<Quiz<Id>, "questions"> & {
  questions: StudentQuizQuestion<Id>[]
}

export interface QuizAttemptAnswer<Id = IdLike> {
  questionId: Id
  selectedOptionIndex: number
}

export interface QuizAttempt<Id = IdLike> extends Timestamped {
  _id: Id
  quiz: Id
  user: Id
  answers: QuizAttemptAnswer<Id>[]
  scorePercent: number
  passed: boolean
}

export interface Certificate<Id = IdLike> extends Timestamped {
  _id: Id
  user: Id
  course: Id
  certificateNumber: string
  issuedAt: Date
}

export interface LiveSession<Id = IdLike> extends Timestamped {
  _id: Id
  course: Id
  instructor: Id
  title: string
  description: string
  scheduledAt: Date
  durationMinutes: number
  meetingUrl: string
  status: LiveSessionStatus
  recordingVideoUrl: string | null
  recordingPublicId: string | null
}

/* ------------------------------------------------------------------ *
 * Commerce
 * ------------------------------------------------------------------ */

export interface Order<Id = IdLike> {
  _id: Id
  orderId: string
  user: Id
  courses: Id[]
  amount: number
  status: OrderStatus
  paymentId?: string
  couponCode: string | null
  discountAmount: number
  createdAt: Date
}

export interface Payment<Id = IdLike> {
  _id: Id
  consumer: Id
  courses: Id[]
  orderId: string
  paymentId: string
  amount: number
  date: Date
}

export interface Coupon<Id = IdLike> extends Timestamped {
  _id: Id
  code: string
  type: CouponType
  value: number
  course: Id | null
  /** `null` means unlimited. */
  maxUses: number | null
  usedCount: number
  expiresAt: Date | null
  active: boolean
  createdBy: Id
}

export interface Refund<Id = IdLike> extends Timestamped {
  _id: Id
  payment: Id
  order: Id
  user: Id
  courses: Id[]
  amount: number
  reason: RefundReason
  notes?: string
  razorpayRefundId?: string
  status: RefundStatus
  initiatedBy: Id
}

export interface InstructorPayoutProfile<Id = IdLike> extends Timestamped {
  _id: Id
  instructor: Id
  bankAccountHolderName: string
  /**
   * Encrypted at rest (AES-256-GCM, see api/lib/crypto.ts) and masked to the
   * last 4 digits on every read path. Note that the schema getter that
   * decrypts it does not run under `.lean()`.
   */
  bankAccountNumber: string
  ifscCode: string
  panNumber: string
  kycStatus: KycStatus
  kycRejectionReason?: string
  platformFeePercent: number
}

/** What a payout profile is allowed to look like once it leaves the server. */
export type MaskedPayoutProfile<Id = IdLike> = Omit<
  InstructorPayoutProfile<Id>,
  "bankAccountNumber"
> & {
  /** Last four digits only. */
  bankAccountNumberLast4: string
}

export interface Payout<Id = IdLike> extends Timestamped {
  _id: Id
  instructor: Id
  periodStart: Date
  periodEnd: Date
  payments: Id[]
  grossAmount: number
  platformFeeAmount: number
  netAmount: number
  status: PayoutStatus
  paidAt?: Date
  transactionReference?: string
}

export interface SubscriptionPlan<Id = IdLike> extends Timestamped {
  _id: Id
  razorpayPlanId: string
  name: string
  priceRupees: number
  interval: SubscriptionInterval
  active: boolean
}

export interface UserSubscription<Id = IdLike> extends Timestamped {
  _id: Id
  user: Id
  plan: Id
  razorpaySubscriptionId: string
  status: SubscriptionStatus
}

export interface Referral<Id = IdLike> extends Timestamped {
  _id: Id
  referrer: Id
  referredUser: Id
  orderId: string
  commissionAmountRupees: number
  status: ReferralStatus
}

export interface OrganizationSeat<Id = IdLike> {
  course: Id
  seatsTotal: number
  seatsUsed: number
}

export interface Organization<Id = IdLike> extends Timestamped {
  _id: Id
  name: string
  owner: Id
  inviteCode: string
  courses: OrganizationSeat<Id>[]
  members: Id[]
}

/* ------------------------------------------------------------------ *
 * Platform / operations
 * ------------------------------------------------------------------ */

export interface Notification<Id = IdLike> extends Timestamped {
  _id: Id
  user: Id
  type: string
  title: string
  body: string
  link: string | null
  read: boolean
}

export interface FeatureFlag<Id = IdLike> {
  _id: Id
  key: string
  enabled: boolean
  description?: string
  /** Empty means "all roles". */
  roles: AccountType[]
  updatedAt: Date
}

export interface AuditLog<Id = IdLike> {
  _id: Id
  actor: Id
  action: string
  targetType?: string
  targetId?: unknown
  details: Record<string, unknown>
  timestamp: Date
}

export interface AnalyticsEvent<Id = IdLike> {
  _id: Id
  actor: Id | null
  /** Free string by design — see Event.js. `EventVerb` is the current taxonomy. */
  verb: string
  object: { type?: string; id?: unknown }
  context: Record<string, unknown>
  timestamp: Date
}

export interface AiInteraction<Id = IdLike> extends Timestamped {
  _id: Id
  user: Id
  type: AiInteractionType
  model: string
  promptVersion: string
  input: string
  output: string
  subSection: Id | null
  succeeded: boolean
  errorMessage: string | null
}
