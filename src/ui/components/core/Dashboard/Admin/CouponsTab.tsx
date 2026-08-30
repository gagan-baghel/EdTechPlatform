"use client"

import { useEffect, useState, useCallback } from "react"
import { useSelector } from "react-redux"

import { createCoupon, deactivateCoupon, listCoupons } from "../../../../services/operations/couponAPI"
import Spinner from "../../../common/Spinner"
import type { RootState } from "../../../../store"

interface Coupon {
  _id: string
  code: string
  type: string
  value: number
  maxUses?: number
  usedCount: number
  active: boolean
  course?: {
    courseName: string
  }
}

export default function CouponsTab() {
  const { token } = useSelector((state: RootState) => state.auth)
  const [coupons, setCoupons] = useState<Coupon[] | null>(null)
  const [form, setForm] = useState({ code: "", type: "percent", value: "", maxUses: "" })

  const load = useCallback(() => {
    listCoupons(token as string).then((res) => setCoupons(res as unknown as Coupon[]))
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code.trim() || !form.value) return
    const result = await createCoupon(token as string, {
      code: form.code.trim(),
      type: form.type,
      value: Number(form.value),
      maxUses: form.maxUses ? Number(form.maxUses) : null,
    })
    if (result) {
      setForm({ code: "", type: "percent", value: "", maxUses: "" })
      load()
    }
  }

  const handleDeactivate = async (couponId: string) => {
    await deactivateCoupon(token as string, couponId)
    listCoupons(token as string).then((res) => setCoupons(res as unknown as Coupon[]))
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-richblack-300">Code</label>
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="SAVE20"
            className="form-style"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-richblack-300">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="form-style"
          >
            <option value="percent">Percent off</option>
            <option value="flat">Flat amount off (₹)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-richblack-300">Value</label>
          <input
            type="number"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            className="form-style w-24"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-richblack-300">Max uses (optional)</label>
          <input
            type="number"
            value={form.maxUses}
            onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            className="form-style w-28"
          />
        </div>
        <button type="submit" className="rounded-md bg-yellow-50 px-4 py-2 font-semibold text-ink">
          Create
        </button>
      </form>

      {!coupons ? (
        <Spinner />
      ) : coupons.length === 0 ? (
        <p className="text-richblack-300">No coupons yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {coupons.map((coupon) => (
            <div
              key={coupon._id}
              className="flex items-center justify-between rounded-md border border-richblack-700 bg-richblack-800 px-4 py-3"
            >
              <div>
                <p className="font-mono font-semibold text-richblack-5">{coupon.code}</p>
                <p className="text-xs text-richblack-300">
                  {coupon.type === "percent" ? `${coupon.value}% off` : `₹${coupon.value} off`}
                  {coupon.course ? ` — ${coupon.course.courseName}` : " — platform-wide"} · used{" "}
                  {coupon.usedCount}
                  {coupon.maxUses ? `/${coupon.maxUses}` : ""}
                </p>
              </div>
              {coupon.active ? (
                <button
                  type="button"
                  onClick={() => handleDeactivate(coupon._id)}
                  className="text-xs text-pink-200 hover:underline"
                >
                  Deactivate
                </button>
              ) : (
                <span className="text-xs text-richblack-500">Inactive</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
