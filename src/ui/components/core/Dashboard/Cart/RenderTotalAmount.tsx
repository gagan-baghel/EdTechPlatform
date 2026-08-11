import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "@/ui/lib/router"

import IconBtn from "../../../common/IconBtn"
import { buyCourse } from "../../../../services/operations/studentFeaturesAPI"
import { checkCoupon } from "../../../../services/operations/couponAPI"
import { formatCurrency } from "../../../../utils/formatCurrency"

import type { RootState } from "../../../../store"
import type { AppDispatch } from "../../../../store"

export default function RenderTotalAmount(): JSX.Element {
  const { total, cart } = useSelector((state: RootState) => state.cart)
  const { token } = useSelector((state: RootState) => state.auth)
  const { user } = useSelector((state: RootState) => state.profile)
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  const [couponInput, setCouponInput] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string; discountAmountRupees: number} | null>(null)
  const [checking, setChecking] = useState(false)
  const [couponError, setCouponError] = useState("")

  const discount = appliedCoupon?.discountAmountRupees || 0
  const payable = Math.max(0, total - discount)

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return
    setChecking(true)
    setCouponError("")
    const courseIds = cart.map((course) => course._id)
    const result = await checkCoupon(token as string, couponInput.trim(), courseIds, total)
    if (result.valid) {
      setAppliedCoupon({ code: couponInput.trim().toUpperCase(), discountAmountRupees: result.discountAmountRupees ?? 0 })
    } else {
      setAppliedCoupon(null)
      setCouponError(result.message || "Invalid coupon")
    }
    setChecking(false)
  }

  const handleBuyCourse = () => {
    const courses = cart.map((course) => course._id)
    buyCourse(token as string, courses, user as unknown as Record<string, unknown>, navigate, dispatch, appliedCoupon?.code || null)
  }

  return (
    <div className="min-w-[280px] rounded-md border-[1px] border-richblack-700 bg-richblack-800 p-6">
      <div className="mb-4 flex flex-col gap-2">
        <label htmlFor="coupon" className="text-xs font-medium text-richblack-300">
          Coupon code
        </label>
        <div className="flex gap-2">
          <input
            id="coupon"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            disabled={Boolean(appliedCoupon)}
            placeholder="Enter code"
            className="form-style flex-1 text-sm"
          />
          {appliedCoupon ? (
            <button
              type="button"
              onClick={() => {
                setAppliedCoupon(null)
                setCouponInput("")
              }}
              className="rounded-md border border-richblack-500 px-3 text-xs text-richblack-300 hover:text-richblack-5"
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              disabled={checking}
              onClick={handleApplyCoupon}
              className="rounded-md border border-richblack-500 px-3 text-xs text-richblack-300 hover:text-richblack-5"
            >
              {checking ? "..." : "Apply"}
            </button>
          )}
        </div>
        {couponError && <p className="text-xs text-pink-200">{couponError}</p>}
        {appliedCoupon && (
          <p className="text-xs text-caribbeangreen-100">
            {appliedCoupon.code} applied — {formatCurrency(discount)} off
          </p>
        )}
      </div>

      <p className="mb-1 text-sm font-medium text-richblack-300">Total:</p>
      {discount > 0 && (
        <p className="mb-1 text-sm text-richblack-400 line-through">{formatCurrency(total)}</p>
      )}
      <p className="mb-6 text-3xl font-medium text-yellow-100">{formatCurrency(payable)}</p>
      <IconBtn
        text="Buy Now"
        onClick={handleBuyCourse}
        customClasses="w-full justify-center"
      />
    </div>
  )
}
