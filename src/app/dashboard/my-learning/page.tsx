"use client"

import RoleRoute from "../../../ui/components/core/Auth/RoleRoute"
import MyLearning from "../../../ui/components/core/Dashboard/MyLearning"
import { ACCOUNT_TYPE } from "../../../ui/utils/constants"

export default function DashboardMyLearningPage() {
  return (
    <RoleRoute allowedRoles={[ACCOUNT_TYPE.STUDENT]}>
      <MyLearning />
    </RoleRoute>
  )
}
