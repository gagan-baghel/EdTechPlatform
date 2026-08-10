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

export function sendOtp(email, navigate) {
  return async (dispatch) => {
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
    } catch (_error) {
      toast.error("Could Not Send OTP")
    } finally {
      dispatch(setLoading(false))
    }
  }
}

export function signUp(
  accountType,
  firstName,
  lastName,
  email,
  password,
  confirmPassword,
  otp,
  navigate
) {
  return async (dispatch) => {
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
    } catch (_error) {
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
async function claimPendingReferral(token) {
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
  } catch (error) {
    // Silent — an invalid/self/already-set referral code is not the
    // user's problem to see a toast about mid-login.
  }
}

export function login(email, password, navigate) {
  return async (dispatch) => {
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("POST", LOGIN_API, {
        email,
        password,
      })
      if (!response.data.success) {
        throw new Error(response.data.message)
      }

      toast.success("Login Successful")
      dispatch(setToken(response.data.token))
      const normalizedUser = normalizeUserAvatar(response.data.user)

      dispatch(setUser(normalizedUser))

      localStorage.setItem("token", JSON.stringify(response.data.token))
      localStorage.setItem("user", JSON.stringify(normalizedUser))

      claimPendingReferral(response.data.token)

      navigate(normalizedUser?.onboarded ? "/dashboard/my-profile" : "/onboarding")
    } catch (_error) {
      toast.error("Login Failed")
    } finally {
      dispatch(setLoading(false))
    }
  }
}

export function getPasswordResetToken(email, setEmailSent) {
  return async (dispatch) => {
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
    } catch (_error) {
      toast.error("Failed To Send Reset Email")
    } finally {
      dispatch(setLoading(false))
    }
  }
}

export function resetPassword(password, confirmPassword, token, navigate) {
  return async (dispatch) => {
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
    } catch (_error) {
      toast.error("Failed To Reset Password")
    } finally {
      dispatch(setLoading(false))
    }
  }
}

export function logout(navigate) {
  return async (dispatch, getState) => {
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
      } catch (error) {
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
