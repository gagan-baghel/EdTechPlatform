"use client"

import RoleRoute from "../../../ui/components/core/Auth/RoleRoute"
import EnrolledCourses from "../../../ui/components/core/Dashboard/EnrolledCourses"
import { ACCOUNT_TYPE } from "../../../ui/utils/constants"

export default function DashboardEnrolledCoursesPage() {
  return (
    <RoleRoute allowedRoles={[ACCOUNT_TYPE.STUDENT]}>
      <EnrolledCourses />
    </RoleRoute>
  )
}
