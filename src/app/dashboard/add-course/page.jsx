"use client"

import RoleRoute from "../../../ui/components/core/Auth/RoleRoute"
import AddCourse from "../../../ui/components/core/Dashboard/AddCourse"
import { ACCOUNT_TYPE } from "../../../ui/utils/constants"

export default function DashboardAddCoursePage() {
  return (
    <RoleRoute allowedRoles={[ACCOUNT_TYPE.INSTRUCTOR]}>
      <AddCourse />
    </RoleRoute>
  )
}
