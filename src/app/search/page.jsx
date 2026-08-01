"use client"

import { Suspense } from "react"
import Search from "../../ui/pages/Search"

// useSearchParams requires a Suspense boundary during prerender.
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-richblack-900">
          <div className="spinner" />
        </div>
      }
    >
      <Search />
    </Suspense>
  )
}
