import { getApiErrorMessage } from "@/ui/lib/apiError"
import type { ApiFailure } from "@/types/api"
import type { DataBody } from "../../types"
import axios from "axios"
import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { courseEndpoints } from "../apis"

const {
  COURSE_DETAILS_API,
  COURSE_CATEGORIES_API,
  GET_ALL_COURSE_API,
  CREATE_COURSE_API,
  EDIT_COURSE_API,
  CREATE_SECTION_API,
  CREATE_SUBSECTION_API,
  UPDATE_SECTION_API,
  UPDATE_SUBSECTION_API,
  DELETE_SECTION_API,
  DELETE_SUBSECTION_API,
  GET_ALL_INSTRUCTOR_COURSES_API,
  DELETE_COURSE_API,
  GET_FULL_COURSE_DETAILS_AUTHENTICATED,
  CREATE_RATING_API,
  LECTURE_COMPLETION_API,
  VIDEO_UPLOAD_SIGNATURE_API,
  UPDATE_WATCH_POSITION_API,
  REORDER_SECTIONS_API,
  REORDER_SUBSECTIONS_API,
  DUPLICATE_COURSE_API,
  ADD_ATTACHMENT_API,
  REMOVE_ATTACHMENT_API,
} = courseEndpoints

/**
 * Uploads a lecture video straight from the browser to Cloudinary — never
 * through our own serverless function, which caps request bodies at 4.5MB
 * and can't hold a real video regardless of any server-side limit. Returns
 * the Cloudinary public_id, which the backend re-verifies by re-fetching
 * the asset rather than trusting it (see verifyUploadedVideo in
 * Subsection.js) before ever storing it against a course.
 */
/**
 * Shared by video and attachment uploads — the signature Cloudinary needs
 * doesn't depend on resource_type (that's only part of the upload URL, not
 * a signed param), so one backend signing endpoint covers both.
 */
async function uploadToCloudinary(
  file: File,
  token: string,
  resourceType: string,
  onProgress?: (percent: number) => void
) {
  const sigResponse = await apiConnector(
    "POST",
    VIDEO_UPLOAD_SIGNATURE_API,
    null,
    { Authorization: `Bearer ${token}` }
  )

  if (!sigResponse?.data?.success) {
    throw new Error("Could not start the upload")
  }

  const data = sigResponse.data.data as { cloudName: string; apiKey: string; timestamp: string; folder: string; signature: string } | undefined
  if (!data) throw new Error("Invalid signature response")
  const { cloudName, apiKey, timestamp, folder, signature } = data

  const formData = new FormData()
  formData.append("file", file)
  formData.append("api_key", apiKey)
  formData.append("timestamp", timestamp)
  formData.append("folder", folder)
  formData.append("signature", signature)

  // Plain axios, not apiConnector's shared instance — that instance sets
  // withCredentials:true, which is unnecessary cross-origin here and only
  // invites CORS trouble against a host we don't control.
  const uploadResponse = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    formData,
    {
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return
        onProgress(Math.round((event.loaded / event.total) * 100))
      },
    }
  )

  return { publicId: uploadResponse.data.public_id, url: uploadResponse.data.secure_url }
}

/**
 * Uploads a lecture video straight from the browser to Cloudinary — never
 * through our own serverless function, which caps request bodies at 4.5MB
 * and can't hold a real video regardless of any server-side limit. Returns
 * the Cloudinary public_id, which the backend re-verifies by re-fetching
 * the asset rather than trusting it (see verifyUploadedVideo in
 * Subsection.js) before ever storing it against a course.
 */
export async function uploadVideoToCloudinary(
  file: File,
  token: string,
  onProgress?: (percent: number) => void
) {
  const { publicId } = await uploadToCloudinary(file, token, "video", onProgress)
  return publicId
}

// Lecture resource attachments (slides, code samples, worksheets) —
// resource_type "raw" since these are arbitrary files, not media Cloudinary
// needs to transcode.
export async function uploadAttachmentToCloudinary(
  file: File,
  token: string,
  onProgress?: (percent: number) => void
) {
  return uploadToCloudinary(file, token, "raw", onProgress)
}

export async function addAttachment<TResult = Record<string, unknown>>(data: Record<string, unknown>, token: string) {
  try {
    const response = await apiConnector<DataBody<TResult> | ApiFailure>("POST", ADD_ATTACHMENT_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) throw new Error("Could not add attachment")
    return response.data.data
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
    return null
  }
}

export async function removeAttachment<TResult = Record<string, unknown>>(data: Record<string, unknown>, token: string) {
  try {
    const response = await apiConnector<DataBody<TResult> | ApiFailure>("POST", REMOVE_ATTACHMENT_API, data, {
      Authorization: `Bearer ${token}`,
    })
    return response?.data?.success ? response.data.data : null
  } catch {
    toast.error("Could not remove attachment")
    return null
  }
}

/**
 * The published catalogue. Paginated server-side (the endpoint used to return
 * every course in one unbounded response), so callers that need more than the
 * default page say so explicitly.
 */
export const getAllCourses = async <TCourse = Record<string, unknown>>(
  { page = 1, limit }: { page?: number; limit?: number } = {}
) => {
  const toastId = toast.loading("Loading...")
  let result: TCourse[] = []
  try {
    const response = await apiConnector<DataBody<TCourse[]> | ApiFailure>(
      "GET",
      GET_ALL_COURSE_API,
      undefined,
      undefined,
      limit ? { page, limit } : { page }
    )
    if (!response.data.success) {
      throw new Error("Could Not Fetch Course Categories")
    }
    result = response.data.data
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
  }
  toast.dismiss(toastId)
  return result
}

export const fetchCourseDetails = async <TCourse = Record<string, unknown>>(
  courseId: string
) => {
  const toastId = toast.loading("Loading...")
  //   dispatch(setLoading(true));
  let result: TCourse | null = null
  try {
    const response = await apiConnector<DataBody<TCourse> | ApiFailure>("POST", COURSE_DETAILS_API, {
      courseId,
    })

    if (!response.data.success) {
      throw new Error(response.data.message)
    }
    result = response.data.data
  } catch (error) {
    // Was `result = error.response.data` — on a failed request this returned
    // the SERVER'S ERROR BODY to the caller, which then treated it as course
    // details. A failure has no course to report.
    console.error("getFullDetailsOfCourse failed", error)
    result = null
  }
  toast.dismiss(toastId)
  //   dispatch(setLoading(false));
  return result
}

// fetching the available course categories
export const fetchCourseCategories = async <TCategory = Record<string, unknown>>() => {
  let result: TCategory[] = []
  try {
    const response = await apiConnector<DataBody<TCategory[]> | ApiFailure>("GET", COURSE_CATEGORIES_API)
    if (!response?.data?.success) {
      throw new Error("Could Not Fetch Course Categories")
    }
    result = response.data.success ? response.data.data : []
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
  }
  return result
}

// add the course details
export const addCourseDetails = async <TResult = Record<string, unknown>>(data: Record<string, unknown>, token: string) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector<DataBody<TResult> | ApiFailure>("POST", CREATE_COURSE_API, data, {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Add Course Details")
    }
    toast.success("Course Details Added Successfully")
    result = response?.data?.data
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
  }
  toast.dismiss(toastId)
  return result
}

// edit the course details
export const editCourseDetails = async <TResult = Record<string, unknown>>(data: Record<string, unknown>, token: string) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector<DataBody<TResult> | ApiFailure>("POST", EDIT_COURSE_API, data, {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Update Course Details")
    }
    toast.success("Course Details Updated Successfully")
    result = response?.data?.data
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
  }
  toast.dismiss(toastId)
  return result
}

// create a section
export const createSection = async <TResult = Record<string, unknown>>(data: Record<string, unknown>, token: string) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector<DataBody<TResult> | ApiFailure>("POST", CREATE_SECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Create Section")
    }
    toast.success("Course Section Created")
    result = (response?.data as { updatedCourse?: unknown })?.updatedCourse ?? null
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
  }
  toast.dismiss(toastId)
  return result
}

// create a subsection
export const createSubSection = async <TResult = Record<string, unknown>>(data: Record<string, unknown>, token: string) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector<DataBody<TResult> | ApiFailure>("POST", CREATE_SUBSECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Add Lecture")
    }
    toast.success("Lecture Added")
    result = response?.data?.data
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
  }
  toast.dismiss(toastId)
  return result
}

// update a section
export const updateSection = async <TResult = Record<string, unknown>>(data: Record<string, unknown>, token: string) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector<DataBody<TResult> | ApiFailure>("POST", UPDATE_SECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Update Section")
    }
    toast.success("Course Section Updated")
    result = response?.data?.data
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
  }
  toast.dismiss(toastId)
  return result
}

// update a subsection
export const updateSubSection = async <TResult = Record<string, unknown>>(data: Record<string, unknown>, token: string) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector<DataBody<TResult> | ApiFailure>("POST", UPDATE_SUBSECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Update Lecture")
    }
    toast.success("Lecture Updated")
    result = response?.data?.data
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
  }
  toast.dismiss(toastId)
  return result
}

// persist a new section order — silent (no toast), called after every
// drag-drop reorder, which would be spammy with a loading toast on each drop
export const reorderSections = async <TResult = Record<string, unknown>>(data: Record<string, unknown>, token: string) => {
  try {
    const response = await apiConnector<
      { success: true; updatedCourse: TResult } | ApiFailure
    >("POST", REORDER_SECTIONS_API, data, {
      Authorization: `Bearer ${token}`,
    })
    return response.data.success ? response.data.updatedCourse : null
  } catch {
    toast.error("Could not save the new order")
    return null
  }
}

export const reorderSubSections = async <TResult = Record<string, unknown>>(data: Record<string, unknown>, token: string) => {
  try {
    // NOTE this endpoint answers `{ success, data: section }` — the updated
    // SECTION, not a course. The client previously read `.updatedCourse`
    // (which only /reorderSections returns), so this was always undefined and
    // a reordered lecture list never re-rendered until a manual refresh.
    const response = await apiConnector<DataBody<TResult> | ApiFailure>(
      "POST", REORDER_SUBSECTIONS_API, data, {
      Authorization: `Bearer ${token}`,
    })
    return response.data.success ? response.data.data : null
  } catch {
    toast.error("Could not save the new order")
    return null
  }
}

export const duplicateCourse = async <TResult = Record<string, unknown>>(data: Record<string, unknown>, token: string) => {
  const toastId = toast.loading("Duplicating course...")
  let result = null
  try {
    const response = await apiConnector<DataBody<TResult> | ApiFailure>("POST", DUPLICATE_COURSE_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could not duplicate course")
    }
    toast.success("Course duplicated")
    result = response.data.data
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
  }
  toast.dismiss(toastId)
  return result
}

// delete a section
export const deleteSection = async <TResult = Record<string, unknown>>(data: Record<string, unknown>, token: string) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector<DataBody<TResult> | ApiFailure>("POST", DELETE_SECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Delete Section")
    }
    toast.success("Course Section Deleted")
    result = response?.data?.data
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
  }
  toast.dismiss(toastId)
  return result
}
// delete a subsection
export const deleteSubSection = async <TResult = Record<string, unknown>>(data: Record<string, unknown>, token: string) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector<DataBody<TResult> | ApiFailure>("POST", DELETE_SUBSECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Delete Lecture")
    }
    toast.success("Lecture Deleted")
    result = response?.data?.data
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
  }
  toast.dismiss(toastId)
  return result
}

// fetching all courses under a specific instructor
export const fetchInstructorCourses = async <TCourse = Record<string, unknown>>(
  token: string
) => {
  let result: TCourse[] = []
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector<DataBody<TCourse[]> | ApiFailure>(
      "GET",
      GET_ALL_INSTRUCTOR_COURSES_API,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    )
    if (!response.data.success) {
      throw new Error("Could Not Fetch Instructor Courses")
    }
    result = response.data.data
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
  }
  toast.dismiss(toastId)
  return result
}

// delete a course
export const deleteCourse = async (data: Record<string, unknown>, token: string) => {
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("DELETE", DELETE_COURSE_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Delete Course")
    }
    toast.success("Course Deleted")
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
  }
  toast.dismiss(toastId)
}

// get full details of a course
export const getFullDetailsOfCourse = async <TResult = Record<string, unknown>>(courseId: string, token: string) => {
  const toastId = toast.loading("Loading...")
  //   dispatch(setLoading(true));
  let result = null
  try {
    const response = await apiConnector<DataBody<TResult> | ApiFailure>(
      "POST",
      GET_FULL_COURSE_DETAILS_AUTHENTICATED,
      {
        courseId,
      },
      {
        Authorization: `Bearer ${token}`,
      }
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }
    result = response?.data?.data
  } catch (error) {
    // Was `result = error.response.data` — on a failed request this returned
    // the SERVER'S ERROR BODY to the caller, which then treated it as course
    // details. A failure has no course to report.
    console.error("getFullDetailsOfCourse failed", error)
    result = null
  }
  toast.dismiss(toastId)
  //   dispatch(setLoading(false));
  return result
}

// mark a lecture as complete
export const markLectureAsComplete = async (data: Record<string, unknown>, token: string) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("POST", LECTURE_COMPLETION_API, data, {
      Authorization: `Bearer ${token}`,
    })

    if (!(response.data as { message?: string }).message) {
      throw new Error((response.data as { error?: string }).error)
    }
    toast.success("Lecture Completed")
    result = true
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
    result = false
  }
  toast.dismiss(toastId)
  return result
}

/**
 * Watch-position heartbeat — called periodically while a lecture plays.
 * Deliberately silent: no toast, no loading state. A background heartbeat
 * that pops an error toast every ~15s on a flaky connection would be far
 * more disruptive than just skipping a beat and trying again next tick.
 */
export const updateWatchPosition = async (data: Record<string, unknown>, token: string) => {
  try {
    const response = await apiConnector<{ success: true; autoCompleted?: boolean } | ApiFailure>("POST", UPDATE_WATCH_POSITION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    return response.data
  } catch {
    return null
  }
}

// create a rating for course
export const createRating = async (data: Record<string, unknown>, token: string) => {
  const toastId = toast.loading("Loading...")
  let success = false
  try {
    const response = await apiConnector("POST", CREATE_RATING_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Create Rating")
    }
    toast.success("Rating Created")
    success = true
  } catch (error) {
    success = false
    toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."))
  }
  toast.dismiss(toastId)
  return success
}
