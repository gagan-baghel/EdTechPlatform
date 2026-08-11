import type { NavigateFunction } from "../../lib/router"
import type { AppDispatch, RootState } from "../../store"
import type { AuthUser } from "../../types"

import { toast } from "react-hot-toast"

import { setLoading, setToken } from "../../slices/authSlice"
import { resetCart } from "../../slices/cartSlice"
import { setUser } from "../../slices/profileSlice"
import { apiConnector } from "../apiconnector"
import { endpoints, affiliateEndpoints } from "../apis"
import { normalizeUserAvatar } from "../../utils/avatar"

const {
  SENDOTP_API,
  SIGNUP_API,
  LOGIN_API,
  RESETPASSTOKEN_API,
  RESETPASSWORD_API,
} = endpoints

export function sendOtp(email: string, navigate: NavigateFunction) {
  return async (dispatch: AppDispatch) => {
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("POST", SENDOTP_API, {
        email,
        checkUserPresent: true,
      })

      if (!response.data.success) {
        throw new Error(response.data.message)
      }

      toast.success("OTP Sent Successfully")
      navigate("/verify-email")
    } catch {
      toast.error("Could Not Send OTP")
    } finally {
      dispatch(setLoading(false))
    }
  }
}

export function signUp(accountType: string, firstName: string, lastName: string, email: string, password: string, confirmPassword: string, otp: string, navigate: NavigateFunction) {
  return async (dispatch: AppDispatch) => {
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("POST", SIGNUP_API, {
        accountType,
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
        otp,
      })
      if (!response.data.success) {
        throw new Error(response.data.message)
      }
      toast.success("Signup Successful")
      navigate("/login")
    } catch {
      toast.error("Signup Failed")
      navigate("/signup")
    } finally {
      dispatch(setLoading(false))
    }
  }
}

// Best-effort, called once after every login — see ReferralCapture in
// AppProviders.jsx for where pendingReferralCode gets set. Cleared
// immediately regardless of outcome: the backend also rejects a second
// attribution attempt (referredBy already set), so there's nothing to
// gain by retrying, and a failed/foreign code shouldn't keep getting
// resubmitted on every subsequent login.
async function claimPendingReferral(token: string) {
  const referralCode = localStorage.getItem("pendingReferralCode")
  if (!referralCode) return

  localStorage.removeItem("pendingReferralCode")
  try {
    await apiConnector(
      "POST",
      affiliateEndpoints.SET_REFERRER_API,
      { referralCode },
      { Authorization: `Bearer ${token}` }
    )
  } catch {
    // Silent — an invalid/self/already-set referral code is not the
    // user's problem to see a toast about mid-login.
  }
}

export function login(email: string, password: string, navigate: NavigateFunction) {
  return async (dispatch: AppDispatch) => {
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("POST", LOGIN_API, {
        email,
        password,
      })
      if (!response.data.success) {
        throw new Error(response.data.message)
      }

      const data = response.data as { token?: string; user?: AuthUser }
      if (!data.token || !data.user) throw new Error("Invalid login response")

      toast.success("Login Successful")
      dispatch(setToken(data.token))
      const normalizedUser = normalizeUserAvatar(data.user)

      dispatch(setUser(normalizedUser))

      localStorage.setItem("token", JSON.stringify(data.token))
      localStorage.setItem("user", JSON.stringify(normalizedUser))

      claimPendingReferral(data.token)

      navigate(normalizedUser?.onboarded ? "/dashboard/my-profile" : "/onboarding")
    } catch {
      toast.error("Login Failed")
    } finally {
      dispatch(setLoading(false))
    }
  }
}

export function getPasswordResetToken(email: string, setEmailSent: (sent: boolean) => void) {
  return async (dispatch: AppDispatch) => {
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("POST", RESETPASSTOKEN_API, {
        email,
      })
      if (!response.data.success) {
        throw new Error(response.data.message)
      }

      toast.success("Reset Email Sent")
      setEmailSent(true)
    } catch {
      toast.error("Failed To Send Reset Email")
    } finally {
      dispatch(setLoading(false))
    }
  }
}

export function resetPassword(password: string, confirmPassword: string, token: string, navigate: NavigateFunction) {
  return async (dispatch: AppDispatch) => {
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("POST", RESETPASSWORD_API, {
        password,
        confirmPassword,
        token,
      })
      if (!response.data.success) {
        throw new Error(response.data.message)
      }

      toast.success("Password Reset Successfully")
      navigate("/login")
    } catch {
      toast.error("Failed To Reset Password")
    } finally {
      dispatch(setLoading(false))
    }
  }
}

export function logout(navigate: NavigateFunction) {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const { token } = getState().auth
    if (token) {
      try {
        // Best-effort: revokes the session server-side so the JWT can't be
        // replayed after logout. If this fails (network blip), still clear
        // local state below — the user's own intent to log out shouldn't
        // be blocked by it.
        await apiConnector("POST", endpoints.LOGOUT_API, null, {
          Authorization: `Bearer ${token}`,
        })
      } catch {
        // Swallowed deliberately — see comment above.
      }
    }
    dispatch(setToken(null))
    dispatch(setUser(null))
    dispatch(resetCart())
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    toast.success("Logged Out")
    navigate("/")
  }
}
