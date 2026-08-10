"use client"

import { useState } from "react"
import { useSelector } from "react-redux"

import { apiConnector } from "../../../services/apiconnector"

// The lecture-grounded AI tutor (plan §6) — answers only from this
// lecture's transcript. Silently renders nothing if the platform has no
// ANTHROPIC_API_KEY configured (the "not configured" response is treated
// the same as any other unavailable feature, not an error state).
export default function TutorPanel({ subSectionId }) {
  const { token } = useSelector((state) => state.auth)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState(null)
  const [asking, setAsking] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  if (unavailable) return null

  const handleAsk = async (e) => {
    e.preventDefault()
    if (!question.trim()) return
    setAsking(true)
    setAnswer(null)
    try {
      const response = await apiConnector(
        "POST",
        "/api/v1/ai/tutor",
        { subSectionId, question: question.trim() },
        { Authorization: `Bearer ${token}` }
      )
      setAnswer(response.data?.data?.answer || "")
    } catch (error) {
      if (error?.response?.status === 503) {
        setUnavailable(true)
      } else {
        setAnswer(error?.response?.data?.message || "Could not get an answer right now.")
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
          className="rounded-md bg-yellow-50 px-4 py-2 text-sm font-semibold text-richblack-900"
        >
          {asking ? "Thinking..." : "Ask"}
        </button>
      </form>
      {answer && <p className="mt-3 whitespace-pre-wrap text-sm text-richblack-100">{answer}</p>}
    </div>
  )
}
