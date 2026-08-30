import React from "react"
import { useSelector } from "react-redux"
import { Navigate } from "@/ui/lib/router"
import Spinner from "../../common/Spinner"
import type { RootState } from "../../../store"

interface RoleRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export default function RoleRoute({ children, allowedRoles = [] }: RoleRouteProps) {
  const { token, hydrated } = useSelector((state: RootState) => state.auth)
  const { user } = useSelector((state: RootState) => state.profile)

  // Storage has not been read yet, so `token` is null for reasons that have
  // nothing to do with being signed out. Deciding here would redirect a
  // signed-in user away from the page they asked for.
  if (!hydrated) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <Spinner />
      </div>
    )
  }

  if (token === null) {
    return <Navigate to="/login" />
  }

  if (!user) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <Spinner />
      </div>
    )
  }

  if (!allowedRoles.includes(user.accountType)) {
    return <Navigate to="/dashboard/my-profile" />
  }

  return <>{children}</>
}
