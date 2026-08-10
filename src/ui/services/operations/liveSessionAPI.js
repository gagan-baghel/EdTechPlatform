import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { liveSessionEndpoints } from "../apis"

const { CREATE_SESSION_API, SESSIONS_FOR_COURSE_API, CANCEL_SESSION_API, UPLOAD_RECORDING_API } =
  liveSessionEndpoints
const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

export async function scheduleSession(token, payload) {
  try {
    const response = await apiConnector("POST", CREATE_SESSION_API, payload, authHeader(token))
    if (!response.data.success) throw new Error(response.data.message)
    toast.success("Session scheduled")
    return response.data.data
  } catch (error) {
    toast.error(error.message || "Could not schedule session")
    return null
  }
}

export async function fetchSessionsForCourse(token, courseId) {
  try {
    const response = await apiConnector("GET", SESSIONS_FOR_COURSE_API(courseId), null, authHeader(token))
    return response.data?.success ? response.data.data : []
  } catch (error) {
    return []
  }
}

export async function cancelSession(token, sessionId) {
  try {
    await apiConnector("PATCH", CANCEL_SESSION_API(sessionId), null, authHeader(token))
    toast.success("Session cancelled")
    return true
  } catch (error) {
    toast.error("Could not cancel session")
    return false
  }
}

export async function attachRecording(token, sessionId, videoPublicId) {
  try {
    const response = await apiConnector(
      "POST",
      UPLOAD_RECORDING_API(sessionId),
      { videoPublicId },
      authHeader(token)
    )
    if (!response.data.success) throw new Error(response.data.message)
    toast.success("Recording attached")
    return response.data.data
  } catch (error) {
    toast.error(error.message || "Could not attach recording")
    return null
  }
}
