"use client"

import PrivateRoute from "../../ui/components/core/Auth/PrivateRoute"
import Dashboard from "../../ui/pages/Dashboard"

export default function DashboardLayout({ children }) {
  return (
    <PrivateRoute>
      <Dashboard>{children}</Dashboard>
    </PrivateRoute>
  )
}
