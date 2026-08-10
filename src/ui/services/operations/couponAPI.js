import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { couponEndpoints } from "../apis"

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

export async function checkCoupon(token, code, courseIds, totalAmountRupees) {
  try {
    const response = await apiConnector(
      "POST",
      couponEndpoints.CHECK_COUPON_API,
      { code, courseIds, totalAmountRupees },
      authHeader(token)
    )
    return response.data
  } catch (error) {
    return { valid: false, message: "Could not check that coupon" }
  }
}

export async function createCoupon(token, payload) {
  try {
    const response = await apiConnector("POST", couponEndpoints.COUPONS_BASE_API, payload, authHeader(token))
    if (!response.data?.success) throw new Error(response.data?.message || "Could not create coupon")
    toast.success("Coupon created")
    return response.data.data
  } catch (error) {
    toast.error(error.message)
    return null
  }
}

export async function listCoupons(token) {
  try {
    const response = await apiConnector("GET", couponEndpoints.COUPONS_BASE_API, null, authHeader(token))
    return response.data?.success ? response.data.data : []
  } catch (error) {
    return []
  }
}

export async function deactivateCoupon(token, couponId) {
  try {
    await apiConnector("PATCH", `${couponEndpoints.COUPONS_BASE_API}/${couponId}/deactivate`, null, authHeader(token))
    return true
  } catch (error) {
    toast.error("Could not deactivate coupon")
    return false
  }
}
