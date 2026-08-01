"use client"

import { useCallback, useEffect, useState } from "react"
import { AiOutlineSearch } from "react-icons/ai"
import { Link, useSearchParams } from "@/ui/lib/router"

import { apiConnector } from "../services/apiconnector"
import { courseEndpoints } from "../services/apis"
import Course_Card from "../components/core/Catalog/Course_Card"
import SearchBar from "../components/common/SearchBar"
import Footer from "../components/common/Footer"

export default function Search() {
  const searchParams = useSearchParams()
  const query = searchParams?.get("q") ?? ""

  const [status, setStatus] = useState("idle") // idle | loading | ready | error
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)

  const runSearch = useCallback(async () => {
    if (query.trim().length < 2) {
      setStatus("idle")
      setResults([])
      return
    }

    setStatus("loading")
    try {
      const res = await apiConnector(
        "GET",
        `${courseEndpoints.SEARCH_COURSES_API}?q=${encodeURIComponent(query)}`
      )
      if (!res.data.success) throw new Error(res.data.message)
      setResults(res.data.data ?? [])
      setTotal(res.data.total ?? 0)
      setStatus("ready")
    } catch (error) {
      console.error("Search failed", error)
      setStatus("error")
    }
  }, [query])

  useEffect(() => {
    runSearch()
  }, [runSearch])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-richblack-900 text-white">
      <div className="mx-auto w-11/12 max-w-6xl py-10">
        <h1 className="text-3xl font-semibold text-richblack-5 sm:text-4xl">
          {query ? <>Results for &ldquo;{query}&rdquo;</> : "Search courses"}
        </h1>

        <SearchBar className="mt-6 max-w-xl" autoFocus={!query} />

        {status === "ready" && (
          <p className="mt-4 text-sm text-richblack-300" aria-live="polite">
            {total} {total === 1 ? "course" : "courses"} found
          </p>
        )}

        {status === "loading" && (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-40 rounded-xl bg-richblack-800" />
                <div className="mt-3 h-5 w-3/4 rounded bg-richblack-800" />
                <div className="mt-2 h-4 w-1/2 rounded bg-richblack-800" />
              </div>
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="mt-16 text-center">
            <h2 className="text-xl font-semibold text-richblack-5">
              Search is temporarily unavailable
            </h2>
            <p className="mt-2 text-richblack-300">Please try again in a moment.</p>
            <button
              type="button"
              onClick={runSearch}
              className="mt-6 rounded-md bg-yellow-50 px-6 py-3 font-semibold text-richblack-900 transition hover:bg-yellow-25"
            >
              Try again
            </button>
          </div>
        )}

        {status === "ready" && results.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-richblack-800">
              <AiOutlineSearch className="text-3xl text-richblack-300" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-richblack-5">
              No courses match &ldquo;{query}&rdquo;
            </h2>
            <p className="mt-2 max-w-md text-richblack-300">
              Try a different keyword, or browse the catalog by category.
            </p>
            <Link
              to="/"
              className="mt-6 rounded-md border border-richblack-600 px-6 py-3 font-semibold text-richblack-5 transition hover:bg-richblack-800"
            >
              Browse categories
            </Link>
          </div>
        )}

        {status === "ready" && results.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((course) => (
              <Course_Card key={course._id} course={course} Height="h-[200px]" />
            ))}
          </div>
        )}

        {status === "idle" && (
          <p className="mt-10 text-richblack-300">
            Enter at least 2 characters to search the catalog.
          </p>
        )}
      </div>
      <Footer />
    </div>
  )
}
