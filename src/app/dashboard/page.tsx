"use client"

import { useEffect } from "react"
import { useNavigate } from "../../ui/lib/router"

export default function DashboardIndexPage() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate("/dashboard/my-profile", { replace: true })
  }, [navigate])

  return null
}
