import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type { AuthUser } from "../types"
import { normalizeUserAvatar } from "../utils/avatar"

export interface ProfileState {
  user: AuthUser | null
  loading: boolean
}

const getStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null

  const user = localStorage.getItem("user")
  if (!user) return null
  try {
    return normalizeUserAvatar(JSON.parse(user) as AuthUser)
  } catch {
    return null
  }
}

const initialState: ProfileState = {
  user: getStoredUser(),
  loading: false,
}

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setUser(state, value: PayloadAction<AuthUser | null>) {
      state.user = value.payload
    },
    setLoading(state, value: PayloadAction<boolean>) {
      state.loading = value.payload
    },
  },
})

export const { setUser, setLoading } = profileSlice.actions
export default profileSlice.reducer
