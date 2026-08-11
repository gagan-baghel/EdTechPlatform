"use client"

import React, { useEffect, useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useNavigate } from "@/ui/lib/router"
import { buyCourse } from "../../../services/operations/studentFeaturesAPI"
import Button from "../../common/Button"
import Spinner from "../../common/Spinner"
import type { RootState } from "../../../store"
import type { AppDispatch } from "../../../store"

export default function SubscriptionPage() {
  const { token } = useSelector((state: RootState) => state.auth)
  const { user } = useSelector((state: RootState) => state.profile)
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const [loading, setLoading] = useState(false)

  // Subscriptions are just a special course ID for now
  const SUBSCRIPTION_COURSE_ID = "sub_pro_1"

  useEffect(() => {
    if (!token) {
      navigate("/login")
    }
  }, [token, navigate])

  const handleSubscribe = async () => {
    if (!token || !user) return
    setLoading(true)
    await buyCourse(token, [SUBSCRIPTION_COURSE_ID], user, navigate, dispatch)
    setLoading(false)
  }

  if (!token) return <Spinner />

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center bg-richblack-900 py-12 px-4">
      <div className="w-full max-w-[800px] text-center">
        <h1 className="mb-4 text-4xl font-bold text-richblack-5">
          Level up your learning with Pro
        </h1>
        <p className="mb-12 text-lg text-richblack-300">
          Get unlimited access to all courses, premium features, and direct Q&A with instructors.
        </p>

        <div className="mx-auto flex max-w-[400px] flex-col rounded-xl border border-richblack-700 bg-richblack-800 p-8 shadow-sm">
          <div className="mb-6 border-b border-richblack-700 pb-6 text-center">
            <h2 className="text-2xl font-bold text-richblack-5">Pro Monthly</h2>
            <div className="mt-4 flex items-baseline justify-center gap-2">
              <span className="text-5xl font-extrabold text-richblack-5">₹999</span>
              <span className="text-lg text-richblack-300">/mo</span>
            </div>
          </div>

          <ul className="mb-8 flex flex-col gap-4 text-left">
            {[
              "Unlimited access to 250+ courses",
              "Priority support from instructors",
              "Offline viewing on mobile",
              "Exclusive community access",
              "Pro certificate of completion",
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-richblack-100">
                <span className="text-yellow-50">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <Button
            disabled={loading}
            onClick={handleSubscribe}
            className="w-full justify-center text-lg"
          >
            {loading ? "Processing..." : "Subscribe Now"}
          </Button>
          <p className="mt-4 text-xs text-richblack-400">
            Cancel anytime. No hidden fees.
          </p>
        </div>
      </div>
    </div>
  )
}
