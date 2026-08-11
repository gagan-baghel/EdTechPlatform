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
}

const getStoredToken = (): string | null => {
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
  token: getStoredToken(),
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
  },
})

export const { setSignupData, setLoading, setToken } = authSlice.actions

export default authSlice.reducer
