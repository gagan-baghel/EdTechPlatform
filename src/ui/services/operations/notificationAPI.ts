import type { ApiFailure } from "@/types/api"
import { apiConnector } from "../apiconnector"

const BASE_URL = "/api/v1/notifications"
const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` })

export interface NotificationItem {
  _id: string
  type: string
  title: string
  body: string
  link: string | null
  read: boolean
  createdAt: string
}

/** This endpoint answers `{ success, notifications, unreadCount }`. */
export interface NotificationsPayload {
  notifications: NotificationItem[]
  unreadCount: number
}

export async function fetchMyNotifications(token: string) {
  try {
    const response = await apiConnector<
      ({ success: true } & NotificationsPayload) | ApiFailure
    >("GET", BASE_URL, null, authHeader(token))
    return response.data.success ? response.data : null
  } catch {
    return null
  }
}

export async function markNotificationRead(token: string, notificationId: string) {
  try {
    await apiConnector("PATCH", `${BASE_URL}/${notificationId}/read`, null, authHeader(token))
  } catch {
    // Silent — a missed read-receipt isn't worth a toast.
  }
}

export async function markAllNotificationsRead(token: string) {
  try {
    await apiConnector("PATCH", `${BASE_URL}/read-all`, null, authHeader(token))
  } catch {
    // Silent, same as above.
  }
}

export async function fetchEmailPreferences(token: string) {
  try {
    const response = await apiConnector("GET", `${BASE_URL}/preferences`, null, authHeader(token))
    return response.data?.success ? response.data.data : {}
  } catch {
    return {}
  }
}

export async function updateEmailPreferences(token: string, preferences: Record<string, boolean>) {
  try {
    await apiConnector("PUT", `${BASE_URL}/preferences`, { preferences }, authHeader(token))
    return true
  } catch {
    return false
  }
}
