import type { ApiFailure } from "@/types/api"
import type { DataBody } from "../../types"
import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { liveSessionEndpoints } from "../apis"

const { CREATE_SESSION_API, SESSIONS_FOR_COURSE_API, CANCEL_SESSION_API, UPLOAD_RECORDING_API } =
  liveSessionEndpoints
const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` })

export async function scheduleSession(token: string, payload: Record<string, unknown>) {
  try {
    const response = await apiConnector("POST", CREATE_SESSION_API, payload, authHeader(token))
    if (!response.data.success) throw new Error(response.data.message)
    toast.success("Session scheduled")
    return response.data.data
  } catch (error) {
    toast.error((error as Error).message || "Could not schedule session")
    return null
  }
}

export async function fetchSessionsForCourse<TSession = Record<string, unknown>>(token: string, courseId: string) {
  try {
    const response = await apiConnector<DataBody<TSession[]> | ApiFailure>("GET", SESSIONS_FOR_COURSE_API(courseId), null, authHeader(token))
    return response.data.success ? response.data.data : []
  } catch {
    return []
  }
}

export async function cancelSession(token: string, sessionId: string) {
  try {
    await apiConnector("PATCH", CANCEL_SESSION_API(sessionId), null, authHeader(token))
    toast.success("Session cancelled")
    return true
  } catch {
    toast.error("Could not cancel session")
    return false
  }
}

export async function attachRecording(token: string, sessionId: string, videoPublicId: string) {
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
    toast.error((error as Error).message || "Could not attach recording")
    return null
  }
}
