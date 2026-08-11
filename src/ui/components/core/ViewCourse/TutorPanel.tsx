"use client"
import axios from "axios"
import type { ApiFailure } from "@/types/api"
import type { DataBody } from "@/ui/types"
import { getApiErrorMessage } from "@/ui/lib/apiError"

import React, { useState } from "react"
import { useSelector } from "react-redux"

import { apiConnector } from "../../../services/apiconnector"
import type { RootState } from "../../../store"

interface TutorPanelProps {
  subSectionId: string
}

export default function TutorPanel({ subSectionId }: TutorPanelProps) {
  const { token } = useSelector((state: RootState) => state.auth)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  if (unavailable) return null

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || !token) return
    setAsking(true)
    setAnswer(null)
    try {
      const response = await apiConnector<DataBody<{ answer?: string }> | ApiFailure>(
        "POST",
        "/api/v1/ai/tutor",
        { subSectionId, question: question.trim() },
        { Authorization: `Bearer ${token}` }
      )
      setAnswer(response.data.success ? (response.data.data?.answer ?? "") : "")
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 503) {
        setUnavailable(true)
      } else {
        setAnswer(getApiErrorMessage(error, "Something went wrong") || "Could not get an answer right now.")
      }
    }
    setAsking(false)
  }

  return (
    <div className="mt-6 rounded-md border border-richblack-700 bg-richblack-800 p-4">
      <p className="mb-2 font-semibold text-richblack-5">Ask the tutor about this lecture</p>
      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What's confusing you at this point?"
          className="form-style flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={asking}
          className="rounded-md bg-yellow-50 px-4 py-2 text-sm font-semibold text-ink"
        >
          {asking ? "Thinking..." : "Ask"}
        </button>
      </form>
      {answer && <p className="mt-3 whitespace-pre-wrap text-sm text-richblack-100">{answer}</p>}
    </div>
  )
}
