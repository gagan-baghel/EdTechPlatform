import { Link } from "@/ui/lib/router"
import React from "react"

interface ErrorProps {
  code?: string;
  title?: string;
  message?: string;
}

/**
 * Shared "we couldn't find that" screen. Used for real 404s and for
 * unknown catalog categories, which is why the copy is configurable.
 */
export default function Error({
  code = "404",
  title = "We couldn't find that page",
  message = "The link may be out of date, or the page may have moved.",
}: ErrorProps) {
  return (
    // Pinned dark — see About.jsx's comment; same gradient-text pattern.
    <div data-theme="dark" className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-richblack-900 px-6 py-16">
      <div className="w-full max-w-lg text-center">
        <p className="bg-gradient-to-r from-[#c3ebfa] via-white to-[#fae27c] bg-clip-text text-7xl font-black tracking-tighter text-transparent sm:text-8xl">
          {code}
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-richblack-5 sm:text-3xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-richblack-300">{message}</p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="rounded-md bg-yellow-50 px-6 py-3 font-semibold text-ink transition hover:bg-yellow-25 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50 focus-visible:ring-offset-2 focus-visible:ring-offset-richblack-900"
          >
            Back to home
          </Link>
          <Link
            to="/catalog/web-development"
            className="rounded-md border border-richblack-600 px-6 py-3 font-semibold text-richblack-5 transition hover:bg-richblack-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50 focus-visible:ring-offset-2 focus-visible:ring-offset-richblack-900"
          >
            Browse courses
          </Link>
        </div>
      </div>
    </div>
  )
}
