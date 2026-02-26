"use client"

import Navbar from "../components/common/Navbar"

export default function AppShell({ children }) {
  return (
    <div className="flex min-h-screen w-screen flex-col bg-richblack-900 font-inter">
      <Navbar />
      {children}
    </div>
  )
}
