"use client"

import RoleRoute from "../../../ui/components/core/Auth/RoleRoute"
import Purchaes from "../../../ui/components/core/Dashboard/StudentPurchaes"
import { ACCOUNT_TYPE } from "../../../ui/utils/constants"

export default function DashboardPurchaseHistoryPage() {
  return (
    <RoleRoute allowedRoles={[ACCOUNT_TYPE.STUDENT]}>
      <Purchaes />
    </RoleRoute>
  )
}
