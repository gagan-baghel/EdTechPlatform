import React from "react"
import { useSelector } from "react-redux"
import { Navigate } from "@/ui/lib/router"
import type { RootState } from "../../../store"

interface PrivateRouteProps {
  children: React.ReactNode
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { token } = useSelector((state: RootState) => state.auth)

  if (token !== null) {
    return <>{children}</>
  }

  return <Navigate to="/login" />
}

export default PrivateRoute
