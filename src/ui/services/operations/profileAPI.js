import { toast } from "react-hot-toast"

import { setLoading, setUser } from "../../slices/profileSlice"
import { apiConnector } from "../apiconnector"
import { profileEndpoints } from "../apis"
import { logout } from "./authAPI"
import { normalizeUserAvatar } from "../../utils/avatar"

const { GET_USER_DETAILS_API, GET_USER_ENROLLED_COURSES_API, GET_INSTRUCTOR_DATA_API } = profileEndpoints

export function getUserDetails(token, navigate) {
  return async (dispatch) => {
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("GET", GET_USER_DETAILS_API, null, {
        Authorization: `Bearer ${token}`,
      })

      if (!response.data.success) {
        throw new Error(response.data.message)
      }
      dispatch(setUser(normalizeUserAvatar(response.data.data)))
    } catch (_error) {
      dispatch(logout(navigate))
      toast.error("Could Not Get User Details")
    } finally {
      dispatch(setLoading(false))
    }
  }
}

export async function getUserEnrolledCourses(token) {
  let result = []
  try {
    const response = await apiConnector(
      "GET",
      GET_USER_ENROLLED_COURSES_API,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }
    result = response.data.data
  } catch (_error) {
    toast.error("Could Not Get Enrolled Courses")
  }
  return result
}

export async function getInstructorData(token) {
  let result = [];
  try{
    const response = await apiConnector("GET", GET_INSTRUCTOR_DATA_API, null, 
    {
      Authorization: `Bearer ${token}`,
    })

    result = response?.data?.courses

  }
  catch(_error) {
    toast.error("Could not Get Instructor Data")
  }
  return result;
}
