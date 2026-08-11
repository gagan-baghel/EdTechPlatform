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
  const { token } = useSelector((state: RootState) => state.auth)
  const { user } = useSelector((state: RootState) => state.profile)

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
