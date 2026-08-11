"use client"

import RoleRoute from "../../../ui/components/core/Auth/RoleRoute"
import Instructor from "../../../ui/components/core/Dashboard/Instructor"
import { ACCOUNT_TYPE } from "../../../ui/utils/constants"

export default function DashboardInstructorPage() {
  return (
    <RoleRoute allowedRoles={[ACCOUNT_TYPE.INSTRUCTOR]}>
      <Instructor />
    </RoleRoute>
  )
}
