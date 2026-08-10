const BASE_URL = "/api/v1"

// AUTH ENDPOINTS
export const endpoints = {
  SENDOTP_API: BASE_URL + "/auth/sendotp",
  SIGNUP_API: BASE_URL + "/auth/signup",
  LOGIN_API: BASE_URL + "/auth/login",
  RESETPASSTOKEN_API: BASE_URL + "/auth/reset-password-token",
  RESETPASSWORD_API: BASE_URL + "/auth/reset-password",
  LOGOUT_API: BASE_URL + "/auth/logout",
  SESSIONS_API: BASE_URL + "/auth/sessions",
  REVOKE_OTHER_SESSIONS_API: BASE_URL + "/auth/sessions/revoke-others",
}

// PROFILE ENDPOINTS
export const profileEndpoints = {
  GET_USER_DETAILS_API: BASE_URL + "/profile/getUserDetails",
  GET_USER_ENROLLED_COURSES_API: BASE_URL + "/profile/getEnrolledCourses",
  GET_INSTRUCTOR_DATA_API: BASE_URL + "/profile/instructorDashboard",
  COMPLETE_ONBOARDING_API: BASE_URL + "/profile/completeOnboarding",
  UPDATE_PREFERENCES_API: BASE_URL + "/profile/preferences",
  EXPORT_MY_DATA_API: BASE_URL + "/profile/exportData",
}

// STUDENTS ENDPOINTS
export const studentEndpoints = {
  COURSE_PAYMENT_API: BASE_URL + "/payment/capturePayment",
  COURSE_VERIFY_API: BASE_URL + "/payment/verifyPayment",
  SEND_PAYMENT_SUCCESS_EMAIL_API: BASE_URL + "/payment/sendPaymentSuccessEmail",
  CREATE_PAYMENT_ENTRY:BASE_URL + "/payment/createPaymentEntry",
  GET_PAYMENT_HISTORY:BASE_URL+ "/payment/getUserPaymentsDetails"
}

// COURSE ENDPOINTS
export const courseEndpoints = {
  GET_ALL_COURSE_API: BASE_URL + "/course/getAllCourses",
  SEARCH_COURSES_API: BASE_URL + "/course/searchCourses",
  COURSE_DETAILS_API: BASE_URL + "/course/getCourseDetails",
  EDIT_COURSE_API: BASE_URL + "/course/editCourse",
  COURSE_CATEGORIES_API: BASE_URL + "/course/showAllCategories",
  CREATE_COURSE_API: BASE_URL + "/course/createCourse",
  CREATE_SECTION_API: BASE_URL + "/course/addSection",
  CREATE_SUBSECTION_API: BASE_URL + "/course/addSubSection",
  UPDATE_SECTION_API: BASE_URL + "/course/updateSection",
  UPDATE_SUBSECTION_API: BASE_URL + "/course/updateSubSection",
  GET_ALL_INSTRUCTOR_COURSES_API: BASE_URL + "/course/getInstructorCourses",
  DELETE_SECTION_API: BASE_URL + "/course/deleteSection",
  REORDER_SECTIONS_API: BASE_URL + "/course/reorderSections",
  REORDER_SUBSECTIONS_API: BASE_URL + "/course/reorderSubSections",
  DUPLICATE_COURSE_API: BASE_URL + "/course/duplicateCourse",
  ADD_ATTACHMENT_API: BASE_URL + "/course/addAttachment",
  REMOVE_ATTACHMENT_API: BASE_URL + "/course/removeAttachment",
  DELETE_SUBSECTION_API: BASE_URL + "/course/deleteSubSection",
  DELETE_COURSE_API: BASE_URL + "/course/deleteCourse",
  GET_FULL_COURSE_DETAILS_AUTHENTICATED:
    BASE_URL + "/course/getFullCourseDetails",
  LECTURE_COMPLETION_API: BASE_URL + "/course/updateCourseProgress",
  UPDATE_WATCH_POSITION_API: BASE_URL + "/course/updateWatchPosition",
  CREATE_RATING_API: BASE_URL + "/course/createRating",
  VIDEO_UPLOAD_SIGNATURE_API: BASE_URL + "/course/videoUploadSignature",
}

// RATINGS AND REVIEWS
export const ratingsEndpoints = {
  REVIEWS_DETAILS_API: BASE_URL + "/course/getReviews",
}

// CATAGORIES API
export const categories = {
  CATEGORIES_API: BASE_URL + "/course/showAllCategories",
}

// CATALOG PAGE DATA
export const catalogData = {
  CATALOGPAGEDATA_API: BASE_URL + "/course/getCategoryPageDetails",
}
// CONTACT-US API
export const contactusEndpoint = {
  CONTACT_US_API: BASE_URL + "/reach/contact",
}

// RECOMMENDATIONS API
export const recommendationEndpoints = {
  BOUGHT_TOGETHER_API: (courseId) => BASE_URL + `/recommendations/bought-together/${courseId}`,
}

// Q&A API
export const qnaEndpoints = {
  ASK_QUESTION_API: BASE_URL + "/qna",
  ANSWER_QUESTION_API: (questionId) => BASE_URL + `/qna/${questionId}/answers`,
  LIST_QUESTIONS_API: (subSectionId) => BASE_URL + `/qna/lecture/${subSectionId}`,
  DELETE_QUESTION_API: (questionId) => BASE_URL + `/qna/${questionId}`,
}

// COUPONS API
export const couponEndpoints = {
  CHECK_COUPON_API: BASE_URL + "/coupons/check",
  COUPONS_BASE_API: BASE_URL + "/coupons",
}

// SUBSCRIPTION API
export const subscriptionEndpoints = {
  LIST_PLANS_API: BASE_URL + "/subscriptions/plans",
  CREATE_SUBSCRIPTION_API: BASE_URL + "/subscriptions",
  MY_SUBSCRIPTION_API: BASE_URL + "/subscriptions/mine",
  CANCEL_SUBSCRIPTION_API: BASE_URL + "/subscriptions/cancel",
}

// ORGANIZATION (B2B) API
export const organizationEndpoints = {
  CREATE_ORG_API: BASE_URL + "/organizations",
  MY_ORGS_API: BASE_URL + "/organizations/mine",
  JOIN_ORG_API: BASE_URL + "/organizations/join",
}

// AFFILIATE API
export const affiliateEndpoints = {
  MY_REFERRAL_CODE_API: BASE_URL + "/affiliate/my-code",
  SET_REFERRER_API: BASE_URL + "/affiliate/set-referrer",
  MY_REFERRALS_API: BASE_URL + "/affiliate/my-referrals",
}

// LIVE SESSION API
export const liveSessionEndpoints = {
  CREATE_SESSION_API: BASE_URL + "/live-sessions",
  SESSIONS_FOR_COURSE_API: (courseId) => BASE_URL + `/live-sessions/course/${courseId}`,
  CANCEL_SESSION_API: (sessionId) => BASE_URL + `/live-sessions/${sessionId}/cancel`,
  UPLOAD_RECORDING_API: (sessionId) => BASE_URL + `/live-sessions/${sessionId}/recording`,
}

// SETTINGS PAGE API
export const settingsEndpoints = {
  UPDATE_DISPLAY_PICTURE_API: BASE_URL + "/profile/updateDisplayPicture",
  UPDATE_PROFILE_API: BASE_URL + "/profile/updateProfile",
  CHANGE_PASSWORD_API: BASE_URL + "/auth/changePassword",
  DELETE_PROFILE_API: BASE_URL + "/profile/deleteProfile",
}

// QUIZ API
export const quizEndpoints = {
  QUIZ_BASE_API: BASE_URL + "/quiz",
  QUIZ_COURSE_INSTRUCTOR_API: (courseId) => BASE_URL + `/quiz/course/${courseId}/instructor`,
  QUIZ_COURSE_STUDENT_API: (courseId) => BASE_URL + `/quiz/course/${courseId}/student`,
  QUIZ_DETAIL_API: (quizId) => BASE_URL + `/quiz/${quizId}`,
  QUIZ_SUBMIT_API: (quizId) => BASE_URL + `/quiz/${quizId}/attempts`,
  QUIZ_MY_ATTEMPTS_API: (quizId) => BASE_URL + `/quiz/${quizId}/attempts/mine`,
}

// INSTRUCTOR PAYOUT API
export const payoutEndpoints = {
  PAYOUT_PROFILE_API: BASE_URL + "/payout/profile",
  MY_PAYOUTS_API: BASE_URL + "/payout/my-payouts",
  ADMIN_PAYOUT_PROFILES_API: BASE_URL + "/payout/admin/profiles",
  ADMIN_PAYOUT_PROFILE_KYC_API: (profileId) => BASE_URL + `/payout/admin/profiles/${profileId}/kyc`,
  ADMIN_GENERATE_PAYOUT_API: BASE_URL + "/payout/admin/generate",
  ADMIN_PAYOUTS_API: BASE_URL + "/payout/admin/payouts",
  ADMIN_MARK_PAYOUT_PAID_API: (payoutId) => BASE_URL + `/payout/admin/payouts/${payoutId}/mark-paid`,
}

// ADMIN CONSOLE API
export const adminEndpoints = {
  ADMIN_USERS_API: BASE_URL + "/admin/users",
  ADMIN_USER_ACTIVE_API: (userId) => BASE_URL + `/admin/users/${userId}/active`,
  ADMIN_COURSES_API: BASE_URL + "/admin/courses",
  ADMIN_COURSE_TAKEDOWN_API: (courseId) => BASE_URL + `/admin/courses/${courseId}/takedown`,
  ADMIN_PAYMENTS_API: BASE_URL + "/admin/payments",
  ADMIN_ORDERS_API: BASE_URL + "/admin/orders",
  ADMIN_AUDIT_LOG_API: BASE_URL + "/admin/audit-log",
  ADMIN_REFUNDS_API: BASE_URL + "/admin/refunds",
  ADMIN_REFUND_ELIGIBLE_API: BASE_URL + "/admin/refunds/eligible",
  ADMIN_FEATURE_FLAGS_API: BASE_URL + "/admin/feature-flags",
  ADMIN_HEALTH_API: BASE_URL + "/admin/health",
  ADMIN_ANALYTICS_API: BASE_URL + "/admin/analytics",
}
