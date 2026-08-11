"use client"

import RoleRoute from "../../../ui/components/core/Auth/RoleRoute"
import Payouts from "../../../ui/components/core/Dashboard/Payouts"
import { ACCOUNT_TYPE } from "../../../ui/utils/constants"

export default function DashboardPayoutsPage() {
  return (
    <RoleRoute allowedRoles={[ACCOUNT_TYPE.INSTRUCTOR]}>
      <Payouts />
    </RoleRoute>
  )
}
