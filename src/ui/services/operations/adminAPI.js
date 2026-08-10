import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { adminEndpoints } from "../apis"

const {
  ADMIN_USERS_API,
  ADMIN_USER_ACTIVE_API,
  ADMIN_COURSES_API,
  ADMIN_COURSE_TAKEDOWN_API,
  ADMIN_PAYMENTS_API,
  ADMIN_ORDERS_API,
  ADMIN_AUDIT_LOG_API,
  ADMIN_FEATURE_FLAGS_API,
  ADMIN_HEALTH_API,
  ADMIN_REFUNDS_API,
  ADMIN_REFUND_ELIGIBLE_API,
  ADMIN_ANALYTICS_API,
} = adminEndpoints

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

export async function fetchUsers(token, params = {}) {
  try {
    const response = await apiConnector("GET", ADMIN_USERS_API, null, authHeader(token), params)
    return response.data
  } catch (error) {
    toast.error("Could not load users")
    return null
  }
}

export async function setUserActive(token, userId, active) {
  try {
    const response = await apiConnector(
      "PATCH",
      ADMIN_USER_ACTIVE_API(userId),
      { active },
      authHeader(token)
    )
    toast.success(active ? "User reactivated" : "User suspended")
    return response.data
  } catch (error) {
    toast.error("Could not update user")
    return null
  }
}

export async function fetchCoursesForModeration(token, params = {}) {
  try {
    const response = await apiConnector("GET", ADMIN_COURSES_API, null, authHeader(token), params)
    return response.data
  } catch (error) {
    toast.error("Could not load courses")
    return null
  }
}

export async function setCourseTakedown(token, courseId, takedown, reason) {
  try {
    const response = await apiConnector(
      "PATCH",
      ADMIN_COURSE_TAKEDOWN_API(courseId),
      { takedown, reason },
      authHeader(token)
    )
    toast.success(takedown ? "Course taken down" : "Course restored")
    return response.data
  } catch (error) {
    toast.error("Could not update course")
    return null
  }
}

export async function fetchPayments(token, params = {}) {
  try {
    const response = await apiConnector("GET", ADMIN_PAYMENTS_API, null, authHeader(token), params)
    return response.data
  } catch (error) {
    toast.error("Could not load payments")
    return null
  }
}

export async function fetchOrders(token, params = {}) {
  try {
    const response = await apiConnector("GET", ADMIN_ORDERS_API, null, authHeader(token), params)
    return response.data
  } catch (error) {
    toast.error("Could not load orders")
    return null
  }
}

export async function fetchAuditLog(token, params = {}) {
  try {
    const response = await apiConnector("GET", ADMIN_AUDIT_LOG_API, null, authHeader(token), params)
    return response.data
  } catch (error) {
    toast.error("Could not load the audit log")
    return null
  }
}

export async function fetchFeatureFlags(token) {
  try {
    const response = await apiConnector("GET", ADMIN_FEATURE_FLAGS_API, null, authHeader(token))
    return response.data
  } catch (error) {
    toast.error("Could not load feature flags")
    return null
  }
}

export async function upsertFeatureFlag(token, flag) {
  try {
    const response = await apiConnector("PUT", ADMIN_FEATURE_FLAGS_API, flag, authHeader(token))
    toast.success("Feature flag saved")
    return response.data
  } catch (error) {
    toast.error("Could not save feature flag")
    return null
  }
}

export async function issueRefund(token, payload) {
  try {
    const response = await apiConnector("POST", ADMIN_REFUNDS_API, payload, authHeader(token))
    toast.success("Refund processed")
    return response.data
  } catch (error) {
    toast.error(error?.response?.data?.message || "Could not process refund")
    return null
  }
}

export async function fetchRefunds(token) {
  try {
    const response = await apiConnector("GET", ADMIN_REFUNDS_API, null, authHeader(token))
    return response.data
  } catch (error) {
    toast.error("Could not load refunds")
    return null
  }
}

export async function fetchRefundEligible(token) {
  try {
    const response = await apiConnector("GET", ADMIN_REFUND_ELIGIBLE_API, null, authHeader(token))
    return response.data
  } catch (error) {
    toast.error("Could not load refund-eligible enrolments")
    return null
  }
}

export async function fetchSystemHealth(token) {
  try {
    const response = await apiConnector("GET", ADMIN_HEALTH_API, null, authHeader(token))
    return response.data
  } catch (error) {
    toast.error("Could not load system health")
    return null
  }
}

export async function fetchAnalyticsOverview(token) {
  try {
    const response = await apiConnector("GET", ADMIN_ANALYTICS_API, null, authHeader(token))
    return response.data?.success ? response.data.data : null
  } catch (error) {
    toast.error("Could not load analytics")
    return null
  }
}
