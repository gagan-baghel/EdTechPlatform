"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"

import { fetchSystemHealth } from "../../../../services/operations/adminAPI"
import Spinner from "../../../common/Spinner"
import type { RootState } from "../../../../store"

const CHECK_LABELS: Record<string, string> = {
  database: "Database",
  cloudinaryConfigured: "Cloudinary",
  mailConfigured: "Email (SMTP)",
  razorpayConfigured: "Razorpay",
  webhookConfigured: "Payment webhook secret",
}

export default function HealthTab() {
  const { token } = useSelector((state: RootState) => state.auth)
  const [checks, setChecks] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    ;(async () => {
      const result = await fetchSystemHealth(token as string)
      if (result) setChecks(result.checks)
    })()
  }, [token])

  if (!checks) return <Spinner />

  const isOk = (value: unknown) => value === "ok" || value === true

  return (
    <div className="flex flex-col gap-3">
      {Object.entries(checks).map(([key, value]) => (
        <div
          key={key}
          className="flex items-center justify-between rounded-md border border-richblack-700 bg-richblack-800 px-4 py-3"
        >
          <span className="text-richblack-5">{CHECK_LABELS[key] ?? key}</span>
          <span className={isOk(value) ? "text-caribbeangreen-100" : "text-pink-200"}>
            {isOk(value) ? "OK" : "Not configured"}
          </span>
        </div>
      ))}
    </div>
  )
}
