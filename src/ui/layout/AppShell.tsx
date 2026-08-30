"use client"

import React from "react"
import Navbar from "../components/common/Navbar"

export default function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-richblack-900 font-inter">
      <Navbar />
      {/*
       * `pt-14` offsets the fixed navbar.
       *
       * The navbar is `fixed top-0 h-14` and NOTHING reserved space for it, so
       * the first 56px of every page in the app rendered underneath it — which
       * is why forms and headings appeared glued to the top bar with no
       * breathing room. Twenty-odd components already compute
       * `calc(100vh-3.5rem)` for their height, so the 3.5rem was always the
       * intent; it just was never applied as an offset.
       *
       * Sections that deliberately sit UNDER a transparent navbar (the
       * homepage hero) opt out with `-mt-14`.
       */}
      <main id="main-content" className="pt-14">
        {children}
      </main>
    </div>
  )
}
