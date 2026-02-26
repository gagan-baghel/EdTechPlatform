"use client"

import RoleRoute from "../../../../ui/components/core/Auth/RoleRoute"
import EditCourse from "../../../../ui/components/core/Dashboard/EditCourse"
import { ACCOUNT_TYPE } from "../../../../ui/utils/constants"

export default function DashboardEditCoursePage() {
  return (
    <RoleRoute allowedRoles={[ACCOUNT_TYPE.INSTRUCTOR]}>
      <EditCourse />
    </RoleRoute>
  )
}
