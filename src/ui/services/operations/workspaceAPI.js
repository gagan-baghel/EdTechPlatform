import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"

const BASE_URL = "/api/v1/workspace"
const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

export async function fetchWorkspace(token) {
  try {
    const response = await apiConnector("GET", BASE_URL, null, authHeader(token))
    return response.data?.success ? response.data.data : null
  } catch (error) {
    toast.error("Could not load your workspace")
    return null
  }
}

export async function saveCourseToWishlist(token, courseId) {
  try {
    await apiConnector("POST", `${BASE_URL}/saved-courses`, { courseId }, authHeader(token))
    toast.success("Saved for later")
    return true
  } catch (error) {
    toast.error("Could not save course")
    return false
  }
}

export async function removeCourseFromWishlist(token, courseId) {
  try {
    await apiConnector("DELETE", `${BASE_URL}/saved-courses`, { courseId }, authHeader(token))
    return true
  } catch (error) {
    toast.error("Could not remove course")
    return false
  }
}

export async function createNote(token, payload) {
  try {
    const response = await apiConnector("POST", `${BASE_URL}/notes`, payload, authHeader(token))
    return response.data?.success ? response.data.data : null
  } catch (error) {
    toast.error("Could not save note")
    return null
  }
}

export async function deleteNote(token, noteId) {
  try {
    await apiConnector("DELETE", `${BASE_URL}/notes/${noteId}`, null, authHeader(token))
    return true
  } catch (error) {
    return false
  }
}

export async function fetchNotesForCourse(token, courseId) {
  try {
    const response = await apiConnector("GET", `${BASE_URL}/notes/course/${courseId}`, null, authHeader(token))
    return response.data?.success ? response.data.data : []
  } catch (error) {
    return []
  }
}
