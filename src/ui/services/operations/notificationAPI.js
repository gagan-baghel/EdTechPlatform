import { apiConnector } from "../apiconnector"

const BASE_URL = "/api/v1/notifications"
const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

export async function fetchMyNotifications(token) {
  try {
    const response = await apiConnector("GET", BASE_URL, null, authHeader(token))
    return response.data?.success ? response.data.data : null
  } catch (error) {
    return null
  }
}

export async function markNotificationRead(token, notificationId) {
  try {
    await apiConnector("PATCH", `${BASE_URL}/${notificationId}/read`, null, authHeader(token))
  } catch (error) {
    // Silent — a missed read-receipt isn't worth a toast.
  }
}

export async function markAllNotificationsRead(token) {
  try {
    await apiConnector("PATCH", `${BASE_URL}/read-all`, null, authHeader(token))
  } catch (error) {
    // Silent, same as above.
  }
}

export async function fetchEmailPreferences(token) {
  try {
    const response = await apiConnector("GET", `${BASE_URL}/preferences`, null, authHeader(token))
    return response.data?.success ? response.data.data : {}
  } catch (error) {
    return {}
  }
}

export async function updateEmailPreferences(token, preferences) {
  try {
    await apiConnector("PUT", `${BASE_URL}/preferences`, { preferences }, authHeader(token))
    return true
  } catch (error) {
    return false
  }
}
