"use client"

import { useEffect } from "react"

// Route-level error boundary. Any render or data error below this point lands
// here instead of unmounting the tree into a blank page.
export default function RouteError({ error, reset }) {
  useEffect(() => {
    console.error("Route error boundary caught:", error)
  }, [error])

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-richblack-900 px-6 py-16">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-2xl font-semibold text-richblack-5 sm:text-3xl">
          Something went wrong
        </h1>
        <p className="mx-auto mt-3 max-w-md text-richblack-300">
          This page hit an unexpected error. Your account and any purchases are
          unaffected.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-yellow-50 px-6 py-3 font-semibold text-richblack-900 transition hover:bg-yellow-25 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50 focus-visible:ring-offset-2 focus-visible:ring-offset-richblack-900"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md border border-richblack-600 px-6 py-3 font-semibold text-richblack-5 transition hover:bg-richblack-800"
          >
            Back to home
          </a>
        </div>
      </div>
    </div>
  )
}
