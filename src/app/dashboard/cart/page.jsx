"use client"

import RoleRoute from "../../../ui/components/core/Auth/RoleRoute"
import Cart from "../../../ui/components/core/Dashboard/Cart"
import { ACCOUNT_TYPE } from "../../../ui/utils/constants"

export default function DashboardCartPage() {
  return (
    <RoleRoute allowedRoles={[ACCOUNT_TYPE.STUDENT]}>
      <Cart />
    </RoleRoute>
  )
}
