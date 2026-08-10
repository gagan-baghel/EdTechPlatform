import { useSelector } from "react-redux"
import { Navigate } from "@/ui/lib/router"
import Spinner from "../../common/Spinner"

export default function RoleRoute({ children, allowedRoles = [] }) {
  const { token } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)

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

  return children
}
