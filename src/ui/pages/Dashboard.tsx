import { useSelector } from "react-redux"
import React from "react"

import Sidebar from "../components/core/Dashboard/Sidebar"
import Spinner from "../components/common/Spinner"
import type { RootState } from "../store"

interface DashboardProps {
  children: React.ReactNode;
}

function Dashboard({ children }: DashboardProps): JSX.Element {
  const { loading: profileLoading } = useSelector((state: RootState) => state.profile)
  const { loading: authLoading } = useSelector((state: RootState) => state.auth)

  if (profileLoading || authLoading) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-col md:flex-row">
      <Sidebar />
      <div className="min-h-0 flex-1 overflow-y-auto md:h-[calc(100vh-3.5rem)]">
        <div className="mx-auto w-11/12 max-w-[1000px] py-8 md:py-10">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
