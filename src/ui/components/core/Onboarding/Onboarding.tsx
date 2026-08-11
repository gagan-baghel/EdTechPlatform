"use client"

import React, { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "@/ui/lib/router"
import { setSignupData } from "../../../slices/authSlice"
import Button from "../../common/Button"
import type { RootState } from "../../../store"
import type { AppDispatch } from "../../../store"

export default function Onboarding() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { signupData } = useSelector((state: RootState) => state.auth)
  const [role, setRole] = useState<"Student" | "Instructor">("Student")

  const handleNext = () => {
    dispatch(
      setSignupData({
        ...signupData,
        accountType: role,
      })
    )
    navigate("/signup")
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-richblack-900 px-4 py-12">
      <div className="w-full max-w-[500px] rounded-lg border border-richblack-700 bg-richblack-800 p-8 shadow-sm">
        <h1 className="mb-2 text-3xl font-bold text-richblack-5 text-center">
          Join IntelleCraft
        </h1>
        <p className="mb-8 text-center text-richblack-300">
          Tell us how you want to use the platform.
        </p>

        <div className="flex flex-col gap-4 mb-8">
          <label
            className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-all ${
              role === "Student"
                ? "border-yellow-50 bg-richblack-700"
                : "border-richblack-700 hover:bg-richblack-800/80"
            }`}
          >
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-richblack-5">I&apos;m a Student</span>
              <span className="text-sm text-richblack-300">
                I want to learn and explore courses.
              </span>
            </div>
            <input
              type="radio"
              name="role"
              value="Student"
              checked={role === "Student"}
              onChange={() => setRole("Student")}
              className="h-4 w-4 text-yellow-50 focus:ring-yellow-50 bg-richblack-700 border-richblack-600"
            />
          </label>

          <label
            className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-all ${
              role === "Instructor"
                ? "border-yellow-50 bg-richblack-700"
                : "border-richblack-700 hover:bg-richblack-800/80"
            }`}
          >
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-richblack-5">I&apos;m an Instructor</span>
              <span className="text-sm text-richblack-300">
                I want to teach and create courses.
              </span>
            </div>
            <input
              type="radio"
              name="role"
              value="Instructor"
              checked={role === "Instructor"}
              onChange={() => setRole("Instructor")}
              className="h-4 w-4 text-yellow-50 focus:ring-yellow-50 bg-richblack-700 border-richblack-600"
            />
          </label>
        </div>

        <Button onClick={handleNext} className="w-full justify-center">
          Continue
        </Button>
      </div>
    </div>
  )
}
