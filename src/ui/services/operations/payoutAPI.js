import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { payoutEndpoints } from "../apis"

const {
  PAYOUT_PROFILE_API,
  MY_PAYOUTS_API,
  ADMIN_PAYOUT_PROFILES_API,
  ADMIN_PAYOUT_PROFILE_KYC_API,
  ADMIN_GENERATE_PAYOUT_API,
  ADMIN_PAYOUTS_API,
  ADMIN_MARK_PAYOUT_PAID_API,
} = payoutEndpoints

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

export async function submitPayoutProfile(token, data) {
  try {
    const response = await apiConnector("POST", PAYOUT_PROFILE_API, data, authHeader(token))
    toast.success("Payout details saved")
    return response.data
  } catch (error) {
    toast.error(error?.response?.data?.message || "Could not save payout details")
    return null
  }
}

export async function fetchMyPayoutProfile(token) {
  try {
    const response = await apiConnector("GET", PAYOUT_PROFILE_API, null, authHeader(token))
    return response.data
  } catch (error) {
    return null
  }
}

export async function fetchMyPayouts(token) {
  try {
    const response = await apiConnector("GET", MY_PAYOUTS_API, null, authHeader(token))
    return response.data
  } catch (error) {
    toast.error("Could not load payout history")
    return null
  }
}

export async function fetchPayoutProfilesForReview(token, params = {}) {
  try {
    const response = await apiConnector("GET", ADMIN_PAYOUT_PROFILES_API, null, authHeader(token), params)
    return response.data
  } catch (error) {
    toast.error("Could not load payout profiles")
    return null
  }
}

export async function setKycStatus(token, profileId, kycStatus, rejectionReason) {
  try {
    const response = await apiConnector(
      "PATCH",
      ADMIN_PAYOUT_PROFILE_KYC_API(profileId),
      { kycStatus, rejectionReason },
      authHeader(token)
    )
    toast.success("KYC status updated")
    return response.data
  } catch (error) {
    toast.error("Could not update KYC status")
    return null
  }
}

export async function generatePayoutRun(token, payload) {
  try {
    const response = await apiConnector("POST", ADMIN_GENERATE_PAYOUT_API, payload, authHeader(token))
    if (response.data?.data) {
      toast.success("Payout run generated")
    } else {
      toast(response.data?.message || "No new earnings for this period")
    }
    return response.data
  } catch (error) {
    toast.error(error?.response?.data?.message || "Could not generate payout run")
    return null
  }
}

export async function fetchPayoutRuns(token, params = {}) {
  try {
    const response = await apiConnector("GET", ADMIN_PAYOUTS_API, null, authHeader(token), params)
    return response.data
  } catch (error) {
    toast.error("Could not load payout runs")
    return null
  }
}

export async function markPayoutPaid(token, payoutId, transactionReference) {
  try {
    const response = await apiConnector(
      "PATCH",
      ADMIN_MARK_PAYOUT_PAID_API(payoutId),
      { transactionReference },
      authHeader(token)
    )
    toast.success("Payout marked as paid")
    return response.data
  } catch (error) {
    toast.error("Could not mark payout as paid")
    return null
  }
}
