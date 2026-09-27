import axios from "axios"
import { toast } from "react-hot-toast"

import type { ApiFailure } from "@/types/api"
import type { AccountType } from "@/types/domain"
import type { DataBody, PagedBody } from "../../types"
import { apiConnector } from "../apiconnector"

/** The user fields the moderation table renders. */
export interface AdminUser {
  _id: string
  firstName: string
  lastName: string
  email: string
  accountType: AccountType
  active: boolean
}

/** The course fields the moderation table renders. */
export interface AdminCourse {
  _id: string
  courseName: string
  status: string
  deletedAt: string | null
  instructor?: { firstName: string; lastName: string }
}
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

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` })

export async function fetchUsers<TRow = AdminUser>(token: string, params = {}) {
  try {
    const response = await apiConnector<PagedBody<TRow> | ApiFailure>("GET", ADMIN_USERS_API, null, authHeader(token), params)
    return response.data.success ? response.data : null
  } catch {
    toast.error("Could not load users")
    return null
  }
}

export async function setUserActive(token: string, userId: string, active: boolean) {
  try {
    const response = await apiConnector(
      "PATCH",
      ADMIN_USER_ACTIVE_API(userId),
      { active },
      authHeader(token)
    )
    toast.success(active ? "User reactivated" : "User suspended")
    return response.data.success ? response.data : null
  } catch {
    toast.error("Could not update user")
    return null
  }
}

export async function fetchCoursesForModeration<TRow = AdminCourse>(token: string, params = {}) {
  try {
    const response = await apiConnector<PagedBody<TRow> | ApiFailure>("GET", ADMIN_COURSES_API, null, authHeader(token), params)
    return response.data.success ? response.data : null
  } catch {
    toast.error("Could not load courses")
    return null
  }
}

export async function setCourseTakedown(
  token: string,
  courseId: string,
  takedown: boolean,
  reason?: string
) {
  try {
    const response = await apiConnector(
      "PATCH",
      ADMIN_COURSE_TAKEDOWN_API(courseId),
      { takedown, reason },
      authHeader(token)
    )
    toast.success(takedown ? "Course taken down" : "Course restored")
    return response.data.success ? response.data : null
  } catch {
    toast.error("Could not update course")
    return null
  }
}

export async function fetchPayments<TRow = Record<string, unknown>>(token: string, params = {}) {
  try {
    const response = await apiConnector<PagedBody<TRow> | ApiFailure>("GET", ADMIN_PAYMENTS_API, null, authHeader(token), params)
    return response.data.success ? response.data : null
  } catch {
    toast.error("Could not load payments")
    return null
  }
}

export async function fetchOrders<TRow = Record<string, unknown>>(token: string, params = {}) {
  try {
    const response = await apiConnector<PagedBody<TRow> | ApiFailure>("GET", ADMIN_ORDERS_API, null, authHeader(token), params)
    return response.data.success ? response.data : null
  } catch {
    toast.error("Could not load orders")
    return null
  }
}

export async function fetchAuditLog<TRow = Record<string, unknown>>(token: string, params = {}) {
  try {
    const response = await apiConnector<PagedBody<TRow> | ApiFailure>("GET", ADMIN_AUDIT_LOG_API, null, authHeader(token), params)
    return response.data.success ? response.data : null
  } catch {
    toast.error("Could not load the audit log")
    return null
  }
}

export async function fetchFeatureFlags<TRow = Record<string, unknown>>(token: string) {
  try {
    const response = await apiConnector<DataBody<TRow[]> | ApiFailure>("GET", ADMIN_FEATURE_FLAGS_API, null, authHeader(token))
    return response.data.success ? response.data : null
  } catch {
    toast.error("Could not load feature flags")
    return null
  }
}

export async function upsertFeatureFlag(token: string, flag: Record<string, unknown>) {
  try {
    const response = await apiConnector("PUT", ADMIN_FEATURE_FLAGS_API, flag, authHeader(token))
    toast.success("Feature flag saved")
    return response.data.success ? response.data : null
  } catch {
    toast.error("Could not save feature flag")
    return null
  }
}

export async function issueRefund(token: string, payload: Record<string, unknown>) {
  try {
    const response = await apiConnector("POST", ADMIN_REFUNDS_API, payload, authHeader(token))
    toast.success("Refund processed")
    return response.data.success ? response.data : null
  } catch (error) {
    toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not process refund")
    return null
  }
}

export async function fetchRefunds<TRow = Record<string, unknown>>(token: string) {
  try {
    const response = await apiConnector<DataBody<TRow[]> | ApiFailure>("GET", ADMIN_REFUNDS_API, null, authHeader(token))
    return response.data.success ? response.data : null
  } catch {
    toast.error("Could not load refunds")
    return null
  }
}

export async function fetchRefundEligible<
  TBody extends { success: true } = { success: true; data: Record<string, unknown>[] },
>(token: string) {
  try {
    const response = await apiConnector<TBody | ApiFailure>("GET", ADMIN_REFUND_ELIGIBLE_API, null, authHeader(token))
    return response.data.success ? response.data : null
  } catch {
    toast.error("Could not load refund-eligible enrolments")
    return null
  }
}

export async function fetchSystemHealth<THealth extends object = { checks: Record<string, unknown> }>(
  token: string
) {
  try {
    const response = await apiConnector<THealth>("GET", ADMIN_HEALTH_API, null, authHeader(token))
    return response.data
  } catch (error) {
    // A 503 is still a health report — the database being down is the
    // answer, not a failed request — so its body is shown, not a toast.
    const body: unknown = axios.isAxiosError(error) ? error.response?.data : null
    if (body && typeof body === "object" && "checks" in body) return body as THealth
    toast.error("Could not load system health")
    return null
  }
}

export async function fetchAnalyticsOverview<TData = Record<string, unknown>>(
  token: string,
  days = 30
) {
  try {
    const response = await apiConnector<DataBody<TData> | ApiFailure>(
      "GET", ADMIN_ANALYTICS_API, null, authHeader(token), { days })
    return response.data?.success ? response.data.data : null
  } catch {
    toast.error("Could not load analytics")
    return null
  }
}
