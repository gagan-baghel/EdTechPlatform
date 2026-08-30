import { useSelector } from "react-redux"
import React from "react"

import Sidebar from "../components/core/Dashboard/Sidebar"
import Spinner from "../components/common/Spinner"
import type { RootState } from "../store"

interface DashboardProps {
  children: React.ReactNode;
}

function Dashboard({ children }: DashboardProps) {
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
        {/* Explicit horizontal padding rather than `w-11/12`: a percentage
            gutter takes 8% off each side of a 375px phone for no benefit,
            while giving a 1400px monitor a 100px+ margin the max-width
            already handles. */}
        <div className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
