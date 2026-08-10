import axios from "axios"
import { toast } from "react-hot-toast"

import { updateCompletedLectures } from "../../slices/viewCourseSlice"
import { setLoading } from "../../slices/profileSlice";
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
async function uploadToCloudinary(file, token, resourceType, onProgress) {
  const sigResponse = await apiConnector(
    "POST",
    VIDEO_UPLOAD_SIGNATURE_API,
    null,
    { Authorization: `Bearer ${token}` }
  )

  if (!sigResponse?.data?.success) {
    throw new Error("Could not start the upload")
  }

  const { cloudName, apiKey, timestamp, folder, signature } = sigResponse.data.data

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
export async function uploadVideoToCloudinary(file, token, onProgress) {
  const { publicId } = await uploadToCloudinary(file, token, "video", onProgress)
  return publicId
}

// Lecture resource attachments (slides, code samples, worksheets) —
// resource_type "raw" since these are arbitrary files, not media Cloudinary
// needs to transcode.
export async function uploadAttachmentToCloudinary(file, token, onProgress) {
  return uploadToCloudinary(file, token, "raw", onProgress)
}

export async function addAttachment(data, token) {
  try {
    const response = await apiConnector("POST", ADD_ATTACHMENT_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) throw new Error("Could not add attachment")
    return response.data.data
  } catch (error) {
    toast.error(error.message)
    return null
  }
}

export async function removeAttachment(data, token) {
  try {
    const response = await apiConnector("POST", REMOVE_ATTACHMENT_API, data, {
      Authorization: `Bearer ${token}`,
    })
    return response?.data?.success ? response.data.data : null
  } catch (error) {
    toast.error("Could not remove attachment")
    return null
  }
}

export const getAllCourses = async () => {
  const toastId = toast.loading("Loading...")
  let result = []
  try {
    const response = await apiConnector("GET", GET_ALL_COURSE_API)
    if (!response?.data?.success) {
      throw new Error("Could Not Fetch Course Categories")
    }
    result = response?.data?.data
  } catch (error) {
    toast.error(error.message)
  }
  toast.dismiss(toastId)
  return result
}

export const fetchCourseDetails = async (courseId) => {
  const toastId = toast.loading("Loading...")
  //   dispatch(setLoading(true));
  let result = null
  try {
    const response = await apiConnector("POST", COURSE_DETAILS_API, {
      courseId,
    })

    if (!response.data.success) {
      throw new Error(response.data.message)
    }
    result = response.data
  } catch (error) {
    result = error.response.data
    // toast.error(error.response.data.message);
  }
  toast.dismiss(toastId)
  //   dispatch(setLoading(false));
  return result
}

// fetching the available course categories
export const fetchCourseCategories = async () => {
  let result = []
  try {
    const response = await apiConnector("GET", COURSE_CATEGORIES_API)
    if (!response?.data?.success) {
      throw new Error("Could Not Fetch Course Categories")
    }
    result = response?.data?.data
  } catch (error) {
    toast.error(error.message)
  }
  return result
}

// add the course details
export const addCourseDetails = async (data, token) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("POST", CREATE_COURSE_API, data, {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Add Course Details")
    }
    toast.success("Course Details Added Successfully")
    result = response?.data?.data
  } catch (error) {
    toast.error(error.message)
  }
  toast.dismiss(toastId)
  return result
}

// edit the course details
export const editCourseDetails = async (data, token) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("POST", EDIT_COURSE_API, data, {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Update Course Details")
    }
    toast.success("Course Details Updated Successfully")
    result = response?.data?.data
  } catch (error) {
    toast.error(error.message)
  }
  toast.dismiss(toastId)
  return result
}

// create a section
export const createSection = async (data, token) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("POST", CREATE_SECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Create Section")
    }
    toast.success("Course Section Created")
    result = response?.data?.updatedCourse
  } catch (error) {
    toast.error(error.message)
  }
  toast.dismiss(toastId)
  return result
}

// create a subsection
export const createSubSection = async (data, token) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("POST", CREATE_SUBSECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Add Lecture")
    }
    toast.success("Lecture Added")
    result = response?.data?.data
  } catch (error) {
    toast.error(error.message)
  }
  toast.dismiss(toastId)
  return result
}

// update a section
export const updateSection = async (data, token) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("POST", UPDATE_SECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Update Section")
    }
    toast.success("Course Section Updated")
    result = response?.data?.data
  } catch (error) {
    toast.error(error.message)
  }
  toast.dismiss(toastId)
  return result
}

// update a subsection
export const updateSubSection = async (data, token) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("POST", UPDATE_SUBSECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Update Lecture")
    }
    toast.success("Lecture Updated")
    result = response?.data?.data
  } catch (error) {
    toast.error(error.message)
  }
  toast.dismiss(toastId)
  return result
}

// persist a new section order — silent (no toast), called after every
// drag-drop reorder, which would be spammy with a loading toast on each drop
export const reorderSections = async (data, token) => {
  try {
    const response = await apiConnector("POST", REORDER_SECTIONS_API, data, {
      Authorization: `Bearer ${token}`,
    })
    return response?.data?.success ? response.data.updatedCourse : null
  } catch (error) {
    toast.error("Could not save the new order")
    return null
  }
}

export const reorderSubSections = async (data, token) => {
  try {
    const response = await apiConnector("POST", REORDER_SUBSECTIONS_API, data, {
      Authorization: `Bearer ${token}`,
    })
    return response?.data?.success ? response.data.data : null
  } catch (error) {
    toast.error("Could not save the new order")
    return null
  }
}

export const duplicateCourse = async (data, token) => {
  const toastId = toast.loading("Duplicating course...")
  let result = null
  try {
    const response = await apiConnector("POST", DUPLICATE_COURSE_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could not duplicate course")
    }
    toast.success("Course duplicated")
    result = response.data.data
  } catch (error) {
    toast.error(error.message)
  }
  toast.dismiss(toastId)
  return result
}

// delete a section
export const deleteSection = async (data, token) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("POST", DELETE_SECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Delete Section")
    }
    toast.success("Course Section Deleted")
    result = response?.data?.data
  } catch (error) {
    toast.error(error.message)
  }
  toast.dismiss(toastId)
  return result
}
// delete a subsection
export const deleteSubSection = async (data, token) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("POST", DELETE_SUBSECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Delete Lecture")
    }
    toast.success("Lecture Deleted")
    result = response?.data?.data
  } catch (error) {
    toast.error(error.message)
  }
  toast.dismiss(toastId)
  return result
}

// fetching all courses under a specific instructor
export const fetchInstructorCourses = async (token) => {
  let result = []
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector(
      "GET",
      GET_ALL_INSTRUCTOR_COURSES_API,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    )
    if (!response?.data?.success) {
      throw new Error("Could Not Fetch Instructor Courses")
    }
    result = response?.data?.data
  } catch (error) {
    toast.error(error.message)
  }
  toast.dismiss(toastId)
  return result
}

// delete a course
export const deleteCourse = async (data, token) => {
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
    toast.error(error.message)
  }
  toast.dismiss(toastId)
}

// get full details of a course
export const getFullDetailsOfCourse = async (courseId, token) => {
  const toastId = toast.loading("Loading...")
  //   dispatch(setLoading(true));
  let result = null
  try {
    const response = await apiConnector(
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
    result = error.response.data
    // toast.error(error.response.data.message);
  }
  toast.dismiss(toastId)
  //   dispatch(setLoading(false));
  return result
}

// mark a lecture as complete
export const markLectureAsComplete = async (data, token) => {
  let result = null
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("POST", LECTURE_COMPLETION_API, data, {
      Authorization: `Bearer ${token}`,
    })

    if (!response.data.message) {
      throw new Error(response.data.error)
    }
    toast.success("Lecture Completed")
    result = true
  } catch (error) {
    toast.error(error.message)
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
export const updateWatchPosition = async (data, token) => {
  try {
    const response = await apiConnector("POST", UPDATE_WATCH_POSITION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    return response.data
  } catch (error) {
    return null
  }
}

// create a rating for course
export const createRating = async (data, token) => {
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
    toast.error(error.message)
  }
  toast.dismiss(toastId)
  return success
}
