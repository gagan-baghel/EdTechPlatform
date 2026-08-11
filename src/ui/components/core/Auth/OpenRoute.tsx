// This will prevent authenticated users from accessing this route
import React from "react"
import { useSelector } from "react-redux"
import { Navigate } from "@/ui/lib/router"
import type { RootState } from "../../../store"

interface OpenRouteProps {
  children: React.ReactNode
}

function OpenRoute({ children }: OpenRouteProps) {
  const { token } = useSelector((state: RootState) => state.auth)

  if (token === null) {
    return <>{children}</>
  }

  return <Navigate to="/dashboard/my-profile" />
}

export default OpenRoute
