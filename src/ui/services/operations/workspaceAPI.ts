import type { ApiFailure } from "@/types/api"
import type { DataBody } from "../../types"
import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"

const BASE_URL = "/api/v1/workspace"
const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` })

export async function fetchWorkspace<TData = Record<string, unknown>>(
  token: string
) {
  try {
    const response = await apiConnector<DataBody<TData> | ApiFailure>("GET", BASE_URL, null, authHeader(token))
    return response.data?.success ? response.data.data : null
  } catch {
    toast.error("Could not load your workspace")
    return null
  }
}

export async function saveCourseToWishlist(token: string, courseId: string) {
  try {
    await apiConnector("POST", `${BASE_URL}/saved-courses`, { courseId }, authHeader(token))
    toast.success("Saved for later")
    return true
  } catch {
    toast.error("Could not save course")
    return false
  }
}

export async function removeCourseFromWishlist(token: string, courseId: string) {
  try {
    await apiConnector("DELETE", `${BASE_URL}/saved-courses`, { courseId }, authHeader(token))
    return true
  } catch {
    toast.error("Could not remove course")
    return false
  }
}

export async function createNote(token: string, payload: Record<string, unknown>) {
  try {
    const response = await apiConnector("POST", `${BASE_URL}/notes`, payload, authHeader(token))
    return response.data?.success ? response.data.data : null
  } catch {
    toast.error("Could not save note")
    return null
  }
}

export async function deleteNote(token: string, noteId: string) {
  try {
    await apiConnector("DELETE", `${BASE_URL}/notes/${noteId}`, null, authHeader(token))
    return true
  } catch {
    return false
  }
}

export async function fetchNotesForCourse(token: string, courseId: string) {
  try {
    const response = await apiConnector("GET", `${BASE_URL}/notes/course/${courseId}`, null, authHeader(token))
    return response.data?.success ? response.data.data : []
  } catch {
    return []
  }
}
