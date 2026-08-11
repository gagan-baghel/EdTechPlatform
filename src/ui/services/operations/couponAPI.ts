import type { ApiFailure } from "@/types/api"
import type { DataBody } from "../../types"
import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { couponEndpoints } from "../apis"

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` })

export interface CouponCheckResult {
  valid: boolean
  message?: string
  discountAmountRupees?: number
}

export async function checkCoupon(
  token: string,
  code: string,
  courseIds: string[],
  totalAmountRupees: number
): Promise<CouponCheckResult> {
  try {
    const response = await apiConnector<CouponCheckResult>(
      "POST",
      couponEndpoints.CHECK_COUPON_API,
      { code, courseIds, totalAmountRupees },
      authHeader(token)
    )
    return response.data
  } catch {
    return { valid: false, message: "Could not check that coupon" }
  }
}

export async function createCoupon(token: string, payload: Record<string, unknown>) {
  try {
    const response = await apiConnector("POST", couponEndpoints.COUPONS_BASE_API, payload, authHeader(token))
    if (!response.data?.success) throw new Error(response.data?.message || "Could not create coupon")
    toast.success("Coupon created")
    return response.data.data
  } catch (error) {
    toast.error((error as Error).message)
    return null
  }
}

export async function listCoupons<TCoupon = Record<string, unknown>>(
  token: string
): Promise<TCoupon[]> {
  try {
    const response = await apiConnector<DataBody<TCoupon[]> | ApiFailure>(
      "GET", couponEndpoints.COUPONS_BASE_API, null, authHeader(token))
    return response.data.success ? response.data.data : []
  } catch {
    return []
  }
}

export async function deactivateCoupon(token: string, couponId: string) {
  try {
    await apiConnector("PATCH", `${couponEndpoints.COUPONS_BASE_API}/${couponId}/deactivate`, null, authHeader(token))
    return true
  } catch {
    toast.error("Could not deactivate coupon")
    return false
  }
}
