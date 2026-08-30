"use client"
import type { ApiFailure } from "@/types/api"
import type { CourseDetail } from "@/ui/types"

import React, { useCallback, useEffect, useReducer, useState } from "react"
import { AiOutlineSearch } from "react-icons/ai"
import { Link, useSearchParams } from "@/ui/lib/router"

import { apiConnector } from "../services/apiconnector"
import { courseEndpoints } from "../services/apis"
import Course_Card from "../components/core/Catalog/Course_Card"
import SearchBar from "../components/common/SearchBar"
import Footer from "../components/common/Footer"

const RESULTS_PER_PAGE = 12

const SORT_OPTIONS = [
  { value: "relevance", label: "Best match" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
]

/** All search filter + pagination state, combined so filter changes
 * atomically reset page to 1 in a single dispatch — no cascading effect. */
interface FilterState {
  page: number
  sort: string
  minPrice: string
  maxPrice: string
  minRating: string
}

type FilterAction =
  | { type: "SET_FILTER"; payload: Partial<Omit<FilterState, "page">> }
  | { type: "SET_PAGE"; payload: number }

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "SET_FILTER":
      // Resetting page to 1 here, atomically with the filter change, avoids
      // the cascading setState-in-effect anti-pattern that a separate
      // useEffect(() => setPage(1), [query, sort, ...]) would introduce.
      return { ...state, ...action.payload, page: 1 }
    case "SET_PAGE":
      return { ...state, page: action.payload }
  }
}

const INITIAL_FILTER: FilterState = {
  page: 1,
  sort: "relevance",
  minPrice: "",
  maxPrice: "",
  minRating: "",
}

export default function Search() {
  const searchParams = useSearchParams()
  const query = searchParams?.get("q") ?? ""

  const [filters, dispatch] = useReducer(filterReducer, INITIAL_FILTER)
  const { page, sort, minPrice, maxPrice, minRating } = filters

  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    query.trim().length >= 2 ? "loading" : "idle"
  )
  const [results, setResults] = useState<CourseDetail[]>([])
  const [total, setTotal] = useState(0)
  const [prevSearchDeps, setPrevSearchDeps] = useState([query, page, sort, minPrice, maxPrice, minRating])

  if (
    query !== prevSearchDeps[0] ||
    page !== prevSearchDeps[1] ||
    sort !== prevSearchDeps[2] ||
    minPrice !== prevSearchDeps[3] ||
    maxPrice !== prevSearchDeps[4] ||
    minRating !== prevSearchDeps[5]
  ) {
    setPrevSearchDeps([query, page, sort, minPrice, maxPrice, minRating])
    if (query.trim().length < 2) {
      setStatus("idle")
      setResults([])
    } else {
      setStatus("loading")
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / RESULTS_PER_PAGE))

  const runSearch = useCallback(() => {
    if (query.trim().length < 2) return

    const params = new URLSearchParams({
      q: query,
      page: String(page),
      limit: String(RESULTS_PER_PAGE),
      sort,
    })
    if (minPrice) params.set("minPrice", minPrice)
    if (maxPrice) params.set("maxPrice", maxPrice)
    if (minRating) params.set("minRating", minRating)

    apiConnector<
      | { success: true; data: CourseDetail[]; total: number; page: number; totalPages: number }
      | ApiFailure
    >(
      "GET",
      `${courseEndpoints.SEARCH_COURSES_API}?${params.toString()}`
    )
      .then((res) => {
        if (!res.data.success) throw new Error(res.data.message)
        setResults(res.data.data)
        setTotal(res.data.total ?? 0)
        setStatus("ready")
      })
      .catch((error) => {
        console.error("Search failed", error)
        setStatus("error")
      })
  }, [query, page, sort, minPrice, maxPrice, minRating, setResults, setTotal, setStatus])

  // When the query URL param changes, reset to page 1 so the user doesn't
  // land on a page past the new result set's total. dispatch (from useReducer)
  // is not a setState call and is not flagged by react-hooks/set-state-in-effect.
  useEffect(() => {
    dispatch({ type: "SET_PAGE", payload: 1 })
  }, [query])

  useEffect(() => {
    if (status === "loading") {
      runSearch()
    }
  }, [runSearch, status])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-richblack-900 text-richblack-5">
      <div className="mx-auto w-11/12 max-w-6xl py-10">
        <h1 className="text-3xl font-semibold text-richblack-5 sm:text-4xl">
          {query ? <>Results for &ldquo;{query}&rdquo;</> : "Search courses"}
        </h1>

        <SearchBar className="mt-6 max-w-xl" autoFocus={!query} />

        {query.trim().length >= 2 && (
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <label className="flex flex-col text-sm text-richblack-200">
              Sort by
              <select
                value={sort}
                onChange={(e) => dispatch({ type: "SET_FILTER", payload: { sort: e.target.value } })}
                className="form-style mt-1"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm text-richblack-200">
              Min price
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => dispatch({ type: "SET_FILTER", payload: { minPrice: e.target.value } })}
                className="form-style mt-1 w-24"
              />
            </label>
            <label className="flex flex-col text-sm text-richblack-200">
              Max price
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => dispatch({ type: "SET_FILTER", payload: { maxPrice: e.target.value } })}
                className="form-style mt-1 w-24"
              />
            </label>
            <label className="flex flex-col text-sm text-richblack-200">
              Min rating
              <select
                value={minRating}
                onChange={(e) => dispatch({ type: "SET_FILTER", payload: { minRating: e.target.value } })}
                className="form-style mt-1"
              >
                <option value="">Any</option>
                <option value="4">4+ stars</option>
                <option value="3">3+ stars</option>
                <option value="2">2+ stars</option>
              </select>
            </label>
          </div>
        )}

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
              className="mt-6 rounded-md bg-yellow-50 px-6 py-3 font-semibold text-ink transition hover:bg-yellow-25"
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
              Try a different keyword or wider filters, or browse the catalog by category.
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
          <>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((course) => (
                <Course_Card key={course._id} course={course} Height="h-[200px]" />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => dispatch({ type: "SET_PAGE", payload: Math.max(1, page - 1) })}
                  className="rounded-md border border-richblack-600 px-4 py-2 text-sm font-semibold text-richblack-5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-richblack-300">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => dispatch({ type: "SET_PAGE", payload: Math.min(totalPages, page + 1) })}
                  className="rounded-md border border-richblack-600 px-4 py-2 text-sm font-semibold text-richblack-5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
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
