"use client"

import RoleRoute from "../../../ui/components/core/Auth/RoleRoute"
import MyCourses from "../../../ui/components/core/Dashboard/MyCourses"
import { ACCOUNT_TYPE } from "../../../ui/utils/constants"

export default function DashboardMyCoursesPage() {
  return (
    <RoleRoute allowedRoles={[ACCOUNT_TYPE.INSTRUCTOR]}>
      <MyCourses />
    </RoleRoute>
  )
}
