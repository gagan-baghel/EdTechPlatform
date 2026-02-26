"use client"

import PrivateRoute from "../../../../../../../ui/components/core/Auth/PrivateRoute"
import RoleRoute from "../../../../../../../ui/components/core/Auth/RoleRoute"
import VideoDetails from "../../../../../../../ui/components/core/ViewCourse/VideoDetails"
import ViewCourse from "../../../../../../../ui/pages/ViewCourse"
import { ACCOUNT_TYPE } from "../../../../../../../ui/utils/constants"

export default function ViewCourseVideoPage() {
  return (
    <PrivateRoute>
      <RoleRoute allowedRoles={[ACCOUNT_TYPE.STUDENT]}>
        <ViewCourse>
          <VideoDetails />
        </ViewCourse>
      </RoleRoute>
    </PrivateRoute>
  )
}
