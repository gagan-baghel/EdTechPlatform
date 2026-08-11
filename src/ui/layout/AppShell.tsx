"use client"

import React from "react"
import Navbar from "../components/common/Navbar"

export default function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-richblack-900 font-inter">
      <Navbar />
      <main id="main-content">{children}</main>
    </div>
  )
}
