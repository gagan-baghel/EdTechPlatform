"use client"

import axios from "axios"
import { useEffect, useRef, useState } from "react"
import { useSelector } from "react-redux"
import ReactMarkdown from "react-markdown"
import { VscClose, VscCommentDiscussion, VscSend } from "react-icons/vsc"

import type { ApiFailure } from "@/types/api"
import type { DataBody } from "@/ui/types"
import { getApiErrorMessage } from "@/ui/lib/apiError"
import { apiConnector } from "../../../services/apiconnector"
import { cn } from "../../../lib/cn"
import type { RootState } from "../../../store"

interface Message {
  role: "user" | "assistant"
  content: string
}

/** The server keeps the last 12 turns; sending more just gets a 400. */
const HISTORY_LIMIT = 12

const SUGGESTIONS: Record<string, string[]> = {
  Student: ["How am I doing overall?", "What should I study next?", "How do I get my certificate?", "Can I get a refund?"],
  Instructor: ["How do I add a quiz?", "How are payouts calculated?", "Which of my courses needs work?"],
  Admin: ["Where do I issue a refund?", "What does 'at risk' mean for a learner?"],
}

/**
 * In-app support: answers "how does X work" from the platform's real rules
 * and "how am I doing" from the user's own numbers (see askAssistant). The
 * conversation lives only in this component — nothing is stored server-side
 * beyond the audit log of each question.
 */
export default function AssistantWidget() {
  const { token } = useSelector((state: RootState) => state.auth)
  const { user } = useSelector((state: RootState) => state.profile)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [unavailable, setUnavailable] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [messages, sending])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  if (!token || !user) return null

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || sending) return
    const next: Message[] = [...messages, { role: "user", content }]
    setMessages(next)
    setDraft("")
    setSending(true)
    try {
      const response = await apiConnector<DataBody<{ answer: string }> | ApiFailure>(
        "POST",
        "/api/v1/ai/assistant",
        { messages: next.slice(-HISTORY_LIMIT) },
        { Authorization: `Bearer ${token}` }
      )
      const answer = response.data.success ? response.data.data.answer : ""
      setMessages([...next, { role: "assistant", content: answer || "I don't have an answer for that." }])
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 503) {
        setUnavailable(getApiErrorMessage(error, "The assistant isn't available right now."))
      } else {
        setMessages([
          ...next,
          { role: "assistant", content: getApiErrorMessage(error, "Something went wrong. Please try again.") },
        ])
      }
    }
    setSending(false)
  }

  const suggestions = SUGGESTIONS[user.accountType] ?? []

  return (
    <div className="print:hidden">
      {/* Docked to the right edge under the navbar — part of the page frame,
          not a box floating over it. */}
      {open && (
        <div
          role="dialog"
          aria-label="Help assistant"
          className="drawer-enter fixed bottom-0 right-0 top-14 z-40 flex w-full flex-col border-l border-richblack-600 bg-richblack-900 sm:w-[400px]"
        >
          <div className="flex items-start justify-between border-b border-richblack-600 px-5 py-4">
            <div>
              <p className="text-base font-semibold text-richblack-5">Ask IntelleCraft</p>
              <p className="stamp mt-1 text-richblack-400">AI · check anything important with support</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded p-1 text-richblack-300 hover:text-richblack-5"
            >
              <VscClose className="text-lg" />
            </button>
          </div>

          <div ref={logRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4" aria-live="polite">
            {unavailable ? (
              <p className="text-sm text-richblack-300">{unavailable}</p>
            ) : messages.length === 0 ? (
              <div>
                <p className="text-sm text-richblack-100">
                  Hi {user.firstName}! Ask about your progress, how something works, or where to find it.
                </p>
                <ul className="mt-4 divide-y divide-richblack-700 border-y border-richblack-700">
                  {suggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => send(s)}
                        className="w-full py-2.5 text-left text-sm text-richblack-100 hover:text-richblack-5"
                      >
                        <span aria-hidden className="mr-2 text-accent">&gt;</span>
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={cn("text-sm", m.role === "user" ? "border-l-2 border-accent pl-3" : "")}>
                  <p className="stamp mb-1 text-richblack-400">{m.role === "user" ? "You" : "Assistant"}</p>
                  <div
                    className={cn(
                      m.role === "user"
                        ? "text-richblack-5"
                        : "text-richblack-100 [&_a]:underline [&_li]:ml-4 [&_ol]:list-decimal [&_p+p]:mt-2 [&_strong]:text-richblack-5 [&_ul]:list-disc"
                    )}
                  >
                    {m.role === "user" ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
                  </div>
                </div>
              ))
            )}
            {sending && <p className="stamp text-richblack-400">Thinking</p>}
          </div>

          {!unavailable && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void send(draft)
              }}
              className="flex items-stretch border-t border-richblack-600"
            >
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void send(draft)
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Type a question…"
                aria-label="Your question"
                className="max-h-28 flex-1 resize-none bg-richblack-900 px-5 py-4 text-sm text-richblack-5 placeholder:text-richblack-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                aria-label="Send"
                className="bg-yellow-50 px-5 text-on-signal disabled:opacity-40"
              >
                <VscSend />
              </button>
            </form>
          )}
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-label="Open help assistant"
          className="stamp fixed bottom-0 right-0 z-40 flex items-center gap-2 border-l border-t border-richblack-600 bg-yellow-50 px-4 py-3 text-on-signal hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-richblack-900"
        >
          <VscCommentDiscussion className="text-base" />
          Ask AI
        </button>
      )}
    </div>
  )
}
