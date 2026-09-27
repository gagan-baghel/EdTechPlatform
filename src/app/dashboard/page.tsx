"use client"

import { useEffect } from "react"
import { useSelector } from "react-redux"
import { useNavigate } from "../../ui/lib/router"
import { ACCOUNT_TYPE } from "../../ui/utils/constants"
import type { RootState } from "../../ui/store"

/** Each role lands on the page it actually works from, not the profile form. */
const HOME: Record<string, string> = {
  [ACCOUNT_TYPE.STUDENT]: "/dashboard/my-learning",
  [ACCOUNT_TYPE.INSTRUCTOR]: "/dashboard/instructor",
  [ACCOUNT_TYPE.ADMIN]: "/dashboard/admin",
}

export default function DashboardIndexPage() {
  const navigate = useNavigate()
  const accountType = useSelector((state: RootState) => state.profile.user?.accountType)

  useEffect(() => {
    if (!accountType) return
    navigate(HOME[accountType] ?? "/dashboard/my-profile", { replace: true })
  }, [navigate, accountType])

  return null
}
