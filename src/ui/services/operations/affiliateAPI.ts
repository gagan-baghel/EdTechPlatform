import type { ApiFailure } from "@/types/api"
import type { DataBody } from "../../types"
import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { affiliateEndpoints } from "../apis"

const { MY_REFERRAL_CODE_API, MY_REFERRALS_API } = affiliateEndpoints
const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` })

export async function fetchMyReferralCode(token: string) {
  try {
    const response = await apiConnector("GET", MY_REFERRAL_CODE_API, null, authHeader(token))
    return response.data?.success ? (response.data.data as { referralCode: string }).referralCode : null
  } catch {
    toast.error("Could not load your referral code")
    return null
  }
}

export async function fetchMyReferrals<TData = Record<string, unknown>>(
  token: string
) {
  try {
    const response = await apiConnector<DataBody<TData> | ApiFailure>("GET", MY_REFERRALS_API, null, authHeader(token))
    return response.data.success ? response.data.data : null
  } catch {
    return null
  }
}
