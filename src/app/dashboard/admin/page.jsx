"use client"

import RoleRoute from "../../../ui/components/core/Auth/RoleRoute"
import Admin from "../../../ui/components/core/Dashboard/Admin"
import { ACCOUNT_TYPE } from "../../../ui/utils/constants"

export default function DashboardAdminPage() {
  return (
    <RoleRoute allowedRoles={[ACCOUNT_TYPE.ADMIN]}>
      <Admin />
    </RoleRoute>
  )
}
