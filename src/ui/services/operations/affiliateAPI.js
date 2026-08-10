import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { affiliateEndpoints } from "../apis"

const { MY_REFERRAL_CODE_API, MY_REFERRALS_API } = affiliateEndpoints
const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

export async function fetchMyReferralCode(token) {
  try {
    const response = await apiConnector("GET", MY_REFERRAL_CODE_API, null, authHeader(token))
    return response.data?.success ? response.data.data.referralCode : null
  } catch (error) {
    toast.error("Could not load your referral code")
    return null
  }
}

export async function fetchMyReferrals(token) {
  try {
    const response = await apiConnector("GET", MY_REFERRALS_API, null, authHeader(token))
    return response.data?.success ? response.data.data : { referrals: [], totalEarnedRupees: 0 }
  } catch (error) {
    return { referrals: [], totalEarnedRupees: 0 }
  }
}
