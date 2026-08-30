import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

/**
 * The signup draft. Every field is optional because the flow fills it in two
 * steps: /onboarding sets only `accountType`, then /signup supplies the rest.
 */
export interface SignupData {
  accountType?: string
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export interface AuthState {
  signupData: SignupData | null
  loading: boolean
  token: string | null
  /**
   * False until the persisted token has been read from storage after mount.
   *
   * Route guards MUST wait for this. `token === null` alone cannot tell
   * "signed out" apart from "not read yet", and treating the second as the
   * first bounced every deep link into a protected page through /login and
   * back out to the profile page.
   */
  hydrated: boolean
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
export const readStoredToken = (): string | null => {
  if (typeof window === "undefined") return null

  const token = localStorage.getItem("token")
  if (!token) return null
  try {
    const parsed: unknown = JSON.parse(token)
    return typeof parsed === "string" ? parsed : null
  } catch {
    // A malformed entry used to throw here and take the whole store
    // initialisation down with it, leaving the app blank until the user
    // cleared storage by hand.
    return null
  }
}

const initialState: AuthState = {
  signupData: null,
  loading: false,
  token: null,
  hydrated: false,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSignupData(state, value: PayloadAction<SignupData | null>) {
      state.signupData = value.payload
    },
    setLoading(state, value: PayloadAction<boolean>) {
      state.loading = value.payload
    },
    setToken(state, value: PayloadAction<string | null>) {
      state.token = value.payload
    },
    /** Applies the persisted token once, after mount, and opens the guards. */
    hydrateToken(state, value: PayloadAction<string | null>) {
      state.token = value.payload
      state.hydrated = true
    },
  },
})

export const { setSignupData, setLoading, setToken, hydrateToken } = authSlice.actions

export default authSlice.reducer
