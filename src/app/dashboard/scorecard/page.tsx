"use client"

import RoleRoute from "../../../ui/components/core/Auth/RoleRoute"
import Scorecard from "../../../ui/components/core/Dashboard/Scorecard"
import { ACCOUNT_TYPE } from "../../../ui/utils/constants"

export default function DashboardScorecardPage() {
  return (
    <RoleRoute allowedRoles={[ACCOUNT_TYPE.STUDENT]}>
      <Scorecard />
    </RoleRoute>
  )
}
