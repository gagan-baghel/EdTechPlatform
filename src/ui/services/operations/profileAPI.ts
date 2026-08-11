import type { ApiFailure } from "@/types/api"
import type { DataBody } from "../../types"
import type { NavigateFunction } from "../../lib/router"
import type { AppDispatch } from "../../store"
import type { AuthUser } from "../../types"
import { toast } from "react-hot-toast"

import { setLoading, setUser } from "../../slices/profileSlice"
import { apiConnector } from "../apiconnector"
import { profileEndpoints } from "../apis"
import { logout } from "./authAPI"
import { normalizeUserAvatar } from "../../utils/avatar"

const { GET_USER_DETAILS_API, GET_USER_ENROLLED_COURSES_API, GET_INSTRUCTOR_DATA_API } = profileEndpoints

export function getUserDetails(token: string, navigate: NavigateFunction) {
  return async (dispatch: AppDispatch) => {
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("GET", GET_USER_DETAILS_API, null, {
        Authorization: `Bearer ${token}`,
      })

      if (!response.data.success) {
        throw new Error(response.data.message)
      }
      dispatch(setUser(normalizeUserAvatar(response.data.data as AuthUser)))
    } catch {
      dispatch(logout(navigate))
      toast.error("Could Not Get User Details")
    } finally {
      dispatch(setLoading(false))
    }
  }
}

export async function getUserEnrolledCourses<TCourse = Record<string, unknown>>(
  token: string
) {
  let result: TCourse[] = []
  try {
    const response = await apiConnector<DataBody<TCourse[]> | ApiFailure>(
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
  } catch {
    toast.error("Could Not Get Enrolled Courses")
  }
  return result
}

export async function getInstructorData<TStat = Record<string, unknown>>(
  token: string
) {
  let result: TStat[] = [];
  try{
    const response = await apiConnector<
      { success: true; courses: TStat[] } | ApiFailure
    >("GET", GET_INSTRUCTOR_DATA_API, null, {
      Authorization: `Bearer ${token}`,
    })

    result = response.data.success ? response.data.courses : []

  }
  catch {
    toast.error("Could not Get Instructor Data")
  }
  return result;
}
