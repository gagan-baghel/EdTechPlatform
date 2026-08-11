import type { NavigateFunction } from "../../lib/router"
import type { AppDispatch } from "../../store"
import type { AuthUser } from "../../types"
import { toast } from "react-hot-toast"

import { setUser } from "../../slices/profileSlice"
import { apiConnector } from "../apiconnector"
import { settingsEndpoints } from "../apis"
import { logout } from "./authAPI"
import { normalizeUserAvatar } from "../../utils/avatar"

const {
  UPDATE_DISPLAY_PICTURE_API,
  UPDATE_PROFILE_API,
  CHANGE_PASSWORD_API,
  DELETE_PROFILE_API,
} = settingsEndpoints

export function updateDisplayPicture(token: string, formData: Record<string, unknown>) {
  return async (dispatch: AppDispatch) => {
    const toastId = toast.loading("Loading...")
    try {
      const response = await apiConnector(
        "PUT",
        UPDATE_DISPLAY_PICTURE_API,
        formData,
        {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        }
      )

      if (!response.data.success) {
        throw new Error(response.data.message)
      }
      toast.success("Display Picture Updated Successfully")
      dispatch(setUser(normalizeUserAvatar(response.data.data as AuthUser)))
    } catch {
      toast.error("Could Not Update Display Picture")
    }
    toast.dismiss(toastId)
  }
}

export function updateProfile(token: string, formData: Record<string, unknown>) {
  return async (dispatch: AppDispatch) => {
    const toastId = toast.loading("Loading...")
    try {
      const response = await apiConnector("PUT", UPDATE_PROFILE_API, formData, {
        Authorization: `Bearer ${token}`,
      })

      if (!response.data.success) {
        throw new Error(response.data.message)
      }
      dispatch(setUser(normalizeUserAvatar((response.data as { updatedUserDetails?: AuthUser }).updatedUserDetails as AuthUser)))
      toast.success("Profile Updated Successfully")
    } catch {
      toast.error("Could Not Update Profile")
    }
    toast.dismiss(toastId)
  }
}

export async function changePassword(token: string, formData: Record<string, unknown>) {
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("POST", CHANGE_PASSWORD_API, formData, {
      Authorization: `Bearer ${token}`,
    })

    if (!response.data.success) {
      throw new Error(response.data.message)
    }
    toast.success("Password Changed Successfully")
  } catch (error) {
    toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could Not Change Password")
  }
  toast.dismiss(toastId)
}

export function deleteProfile(token: string, navigate: NavigateFunction) {
  return async (dispatch: AppDispatch) => {
    const toastId = toast.loading("Loading...")
    try {
      const response = await apiConnector("DELETE", DELETE_PROFILE_API, null, {
        Authorization: `Bearer ${token}`,
      })
      if (!response.data.success) {
        throw new Error(response.data.message)
      }
      toast.success("Profile Deleted Successfully")
      dispatch(logout(navigate))
    } catch {
      toast.error("Could Not Delete Profile")
    }
    toast.dismiss(toastId)
  }
}
