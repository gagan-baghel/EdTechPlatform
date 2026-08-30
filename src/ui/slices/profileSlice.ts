import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type { AuthUser } from "../types"
import { normalizeUserAvatar } from "../utils/avatar"

export interface ProfileState {
  user: AuthUser | null
  loading: boolean
}

/**
 * Initial state must match what the SERVER renders, which is an empty store.
 *
 * Reading localStorage here ran during the client's first (hydration) render,
 * so the server produced a signed-out tree and the client produced a signed-in
 * one. React cannot reconcile that: it discards the server HTML and
 * re-renders everything on the client, logging a hydration error on every page
 * for every signed-in user — the SSR output was worse than useless.
 *
 * The stored values are applied instead by `hydrateFromStorage`, dispatched
 * once after mount from AppProviders.
 */
export const readStoredUser = (): AuthUser | null => {
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
  user: null,
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
    /** Applies the persisted user once, after mount. */
    hydrateUser(state, value: PayloadAction<AuthUser | null>) {
      state.user = value.payload
    },
  },
})

export const { setUser, setLoading, hydrateUser } = profileSlice.actions
export default profileSlice.reducer
