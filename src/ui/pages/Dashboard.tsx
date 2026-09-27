import { useSelector } from "react-redux"
import React from "react"

import Sidebar from "../components/core/Dashboard/Sidebar"
import AssistantWidget from "../components/core/Dashboard/AssistantWidget"
import { useLocation } from "../lib/router"
import type { RootState } from "../store"

interface DashboardProps {
  children: React.ReactNode;
}

function Dashboard({ children }: DashboardProps) {
  const { loading: profileLoading } = useSelector((state: RootState) => state.profile)
  const { loading: authLoading } = useSelector((state: RootState) => state.auth)
  const { pathname } = useLocation()

  if (profileLoading || authLoading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-richblack-900" aria-busy="true" />
    )
  }

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-col bg-richblack-900 md:flex-row">
      <Sidebar />
      <div className="min-h-0 flex-1 overflow-y-auto md:h-[calc(100vh-3.5rem)] print:h-auto print:overflow-visible">
        {/* Explicit horizontal padding rather than `w-11/12`: a percentage
            gutter takes 8% off each side of a 375px phone for no benefit,
            while giving a 1400px monitor a 100px+ margin the max-width
            already handles. */}
        <div className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
          {/* Keyed by route, so each page rises in as it arrives. */}
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </div>
      </div>
      <AssistantWidget />
    </div>
  )
}

export default Dashboard
