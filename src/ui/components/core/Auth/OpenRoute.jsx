// This will prevent authenticated users from accessing this route
import { useSelector } from "react-redux"
import { Navigate } from "@/ui/lib/router"

function OpenRoute({ children }) {
  const { token } = useSelector((state) => state.auth)

  if (token === null) {
    return children
  }

  return <Navigate to="/dashboard/my-profile" />
}

export default OpenRoute
