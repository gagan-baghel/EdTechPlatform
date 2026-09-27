"use client"
import axios from "axios"
import type { ApiFailure } from "@/types/api"
import type { DataBody } from "@/ui/types"

import { useState } from "react"
import { useSelector } from "react-redux"

import { apiConnector } from "../../../../services/apiconnector"
import type { RootState } from "../../../../store"

// Instructor authoring copilot (plan §6) — drafts an outline the
// instructor copies from manually; it never writes sections/lectures
// itself. Kept as a standalone helper above the course form rather than
// wired into its fields, so it can't interfere with the form's own state.
export default function CopilotOutlineHelper() {
  const { token } = useSelector((state: RootState) => state.auth)
  const [topic, setTopic] = useState("")
  const [outline, setOutline] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [open, setOpen] = useState(false)

  if (unavailable) return null

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) return
    setLoading(true)
    setOutline(null)
    try {
      const response = await apiConnector<DataBody<{ outline?: string }> | ApiFailure>(
        "POST",
        "/api/v1/ai/copilot/outline",
        { topic: topic.trim() },
        { Authorization: `Bearer ${token}` }
      )
      setOutline(response.data.success ? (response.data.data?.outline ?? "") : "")
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 503) {
        setUnavailable(true)
      } else {
        setOutline("Could not generate an outline right now.")
      }
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 text-sm font-semibold text-accent hover:underline"
      >
        ✨ Draft an outline with AI
      </button>
    )
  }

  return (
    <div className="mb-6 rounded-md border border-richblack-700 bg-richblack-800 p-4">
      <p className="mb-2 text-sm text-richblack-300">
        Describe your course topic — this only drafts a starting point for you to edit, nothing is created automatically.
      </p>
      <form onSubmit={handleGenerate} className="flex gap-2">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Intro to React for backend developers"
          className="form-style flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-yellow-50 px-4 py-2 text-sm font-semibold text-on-signal"
        >
          {loading ? "Drafting..." : "Draft outline"}
        </button>
      </form>
      {outline && (
        <pre className="mt-3 whitespace-pre-wrap rounded-md bg-richblack-900 p-3 text-xs text-richblack-100">
          {outline}
        </pre>
      )}
    </div>
  )
}
