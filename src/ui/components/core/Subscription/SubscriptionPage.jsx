"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { useNavigate } from "@/ui/lib/router"

import {
  cancelMySubscription,
  fetchMySubscription,
  fetchPlans,
  subscribeToPlan,
} from "../../../services/operations/subscriptionAPI"
import { formatCurrency } from "../../../utils/formatCurrency"
import Button from "../../common/Button"
import Card from "../../common/Card"
import Spinner from "../../common/Spinner"

export default function SubscriptionPage() {
  const { token } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)
  const navigate = useNavigate()

  const [plans, setPlans] = useState(null)
  const [mySubscription, setMySubscription] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(Boolean(token))

  const load = async () => {
    const plansResult = await fetchPlans()
    setPlans(plansResult)

    if (token) {
      const sub = await fetchMySubscription(token)
      setMySubscription(sub)
    }
    setLoadingStatus(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleSubscribe = (planId) => {
    if (!token) {
      navigate("/login")
      return
    }
    subscribeToPlan(token, planId, user, load)
  }

  const handleCancel = async () => {
    const ok = await cancelMySubscription(token)
    if (ok) load()
  }

  if (!plans || loadingStatus) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <Spinner />
      </div>
    )
  }

  const isActive = mySubscription && mySubscription.status !== "cancelled"

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-richblack-5">
      <h1 className="text-center text-3xl font-semibold">All-access subscription</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-richblack-300">
        One plan, every published course — no per-course purchases.
      </p>

      {isActive && (
        <Card padding="p-6" className="mx-auto mt-10 max-w-md text-center">
          <p className="text-sm text-richblack-300">Current plan</p>
          <p className="mt-1 text-xl font-semibold text-richblack-5">{mySubscription.plan?.name}</p>
          <p className="mt-1 text-sm capitalize text-caribbeangreen-100">{mySubscription.status}</p>
          <Button variant="danger" size="sm" className="mt-4" onClick={handleCancel}>
            Cancel subscription
          </Button>
        </Card>
      )}

      {!isActive && (
        <div className="mx-auto mt-10 grid max-w-2xl gap-6 sm:grid-cols-2">
          {plans.length === 0 && (
            <p className="col-span-2 text-center text-richblack-400">
              No subscription plans are available right now.
            </p>
          )}
          {plans.map((plan) => (
            <Card key={plan._id} padding="p-6" className="flex flex-col items-center text-center">
              <p className="text-lg font-semibold text-richblack-5">{plan.name}</p>
              <p className="mt-2 text-3xl font-bold text-yellow-50">{formatCurrency(plan.priceRupees)}</p>
              <p className="text-sm text-richblack-400">per {plan.interval === "monthly" ? "month" : "year"}</p>
              <Button className="mt-6" onClick={() => handleSubscribe(plan._id)}>
                Subscribe
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
