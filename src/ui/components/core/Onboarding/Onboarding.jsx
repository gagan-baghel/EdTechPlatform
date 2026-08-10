"use client"

import { useState } from "react"
import { useSelector } from "react-redux"
import { Navigate, useNavigate } from "@/ui/lib/router"

import { apiConnector } from "../../../services/apiconnector"
import { profileEndpoints } from "../../../services/apis"
import { ACCOUNT_TYPE } from "../../../utils/constants"
import Button from "../../common/Button"
import Spinner from "../../common/Spinner"

const GOALS = [
  { value: "career_switch", label: "Switch careers" },
  { value: "skill_upgrade", label: "Upgrade my skills for my current role" },
  { value: "certification", label: "Earn a certification" },
  { value: "hobby", label: "Learn something new for fun" },
]

export default function Onboarding() {
  const { token } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)
  const navigate = useNavigate()
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (token === null) return <Navigate to="/login" />
  if (!user) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <Spinner />
      </div>
    )
  }

  const finish = async (learningGoal) => {
    setSubmitting(true)
    try {
      await apiConnector(
        "PUT",
        profileEndpoints.COMPLETE_ONBOARDING_API,
        learningGoal ? { learningGoal } : {},
        { Authorization: `Bearer ${token}` }
      )
    } catch (error) {
      // Onboarding is a one-time UX nicety, not a gate — if the request
      // fails, still let the user into the product rather than stranding
      // them on this screen.
    }
    if (user.accountType === ACCOUNT_TYPE.INSTRUCTOR) {
      navigate("/dashboard/add-course")
    } else {
      // Not a category-specific catalog slug (those are dynamic and might
      // not exist yet on a fresh platform) — the homepage is always valid
      // and is exactly where course discovery starts anyway.
      navigate("/")
    }
    setSubmitting(false)
  }

  if (user.accountType === ACCOUNT_TYPE.INSTRUCTOR) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-2xl flex-col items-center justify-center px-4 text-center text-white">
        <h1 className="text-3xl font-semibold">Welcome, {user.firstName}</h1>
        <p className="mt-4 text-richblack-300">
          Here&apos;s the fastest path to your first published course:
        </p>
        <ol className="mt-6 space-y-3 text-left text-richblack-100">
          <li>1. Add the course title, description, price and thumbnail.</li>
          <li>2. Build your curriculum — sections and lectures, with video for each.</li>
          <li>3. Publish (or schedule it for later) and you&apos;re live.</li>
        </ol>
        <Button className="mt-8" disabled={submitting} onClick={() => finish(null)}>
          Start my first course
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-xl flex-col items-center justify-center px-4 text-center text-white">
      <h1 className="text-3xl font-semibold">Welcome, {user.firstName}</h1>
      <p className="mt-4 text-richblack-300">What brings you here? This helps us point you at the right courses.</p>

      <div className="mt-8 flex w-full flex-col gap-3">
        {GOALS.map((goal) => (
          <button
            key={goal.value}
            type="button"
            disabled={submitting}
            onClick={() => setSelectedGoal(goal.value)}
            className={`rounded-md border px-4 py-3 text-left transition ${
              selectedGoal === goal.value
                ? "border-yellow-50 bg-richblack-700"
                : "border-richblack-600 bg-richblack-800 hover:border-richblack-400"
            }`}
          >
            {goal.label}
          </button>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <button
          type="button"
          disabled={submitting}
          onClick={() => finish(null)}
          className="text-sm text-richblack-400 hover:underline"
        >
          Skip for now
        </button>
        <Button disabled={submitting || !selectedGoal} onClick={() => finish(selectedGoal)}>
          Continue
        </Button>
      </div>
    </div>
  )
}
