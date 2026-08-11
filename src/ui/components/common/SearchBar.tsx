"use client"

import React, { useState } from "react"
import { AiOutlineSearch } from "react-icons/ai"
import { useNavigate } from "@/ui/lib/router"

export interface SearchBarProps {
  className?: string
  autoFocus?: boolean
  onSubmitted?: () => void
}

export default function SearchBar({ className = "", autoFocus = false, onSubmitted }: SearchBarProps): React.JSX.Element {
  const [value, setValue] = useState("")
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = value.trim()
    if (q.length < 2) return
    navigate(`/search?q=${encodeURIComponent(q)}`)
    onSubmitted?.()
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={`relative ${className}`}>
      <label htmlFor="course-search" className="sr-only">
        Search courses
      </label>
      <AiOutlineSearch
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-richblack-400"
        aria-hidden="true"
      />
      <input
        id="course-search"
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        placeholder="Search courses..."
        className="w-full rounded-full border border-richblack-600 bg-richblack-800/80 py-2 pl-10 pr-4 text-sm text-richblack-5 placeholder:text-richblack-400 focus:border-yellow-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50"
      />
    </form>
  )
}
