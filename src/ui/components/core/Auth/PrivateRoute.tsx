import React from "react"
import { useSelector } from "react-redux"

import { Navigate } from "@/ui/lib/router"
import Spinner from "../../common/Spinner"
import type { RootState } from "../../../store"

interface PrivateRouteProps {
  children: React.ReactNode
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { token, hydrated } = useSelector((state: RootState) => state.auth)

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

  if (token !== null) {
    return <>{children}</>
  }

  return <Navigate to="/login" />
}

export default PrivateRoute
