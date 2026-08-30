"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useSelector } from "react-redux"

import {
  fetchQuestionsForLecture,
  askQuestion,
  answerQuestion,
} from "../../../services/operations/qnaAPI"
import type { RootState } from "../../../store"

interface UserDetail {
  firstName: string
  lastName: string
}

interface Answer {
  _id: string
  text: string
  answeredBy: UserDetail
}

interface Question {
  _id: string
  title: string
  body: string
  askedBy: UserDetail
  answers: Answer[]
}

interface AnswerFormProps {
  questionId: string
  token: string | null
  onAnswered: () => void
}

function AnswerForm({ questionId, token, onAnswered }: AnswerFormProps) {
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !token) return
    setSubmitting(true)
    const success = await answerQuestion(token, questionId, text.trim())
    if (success) {
      setText("")
      onAnswered()
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write an answer..."
        className="form-style min-h-[80px] text-sm"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onAnswered}
          className="rounded-md bg-richblack-700 px-3 py-1 text-sm font-semibold text-richblack-5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-yellow-50 px-3 py-1 text-sm font-semibold text-ink"
        >
          {submitting ? "Posting..." : "Post answer"}
        </button>
      </div>
    </form>
  )
}

interface QnAPanelProps {
  courseId: string
  subSectionId: string
}

export default function QnAPanel({ courseId, subSectionId }: QnAPanelProps) {
  const { token } = useSelector((state: RootState) => state.auth)
  const [questions, setQuestions] = useState<Question[]>([])
  const [asking, setAsking] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!token) return Promise.resolve()
    return fetchQuestionsForLecture(token, subSectionId).then((result) => {
      if (result) {
        setQuestions(result as Question[])
      }
    })
  }, [token, subSectionId])

  useEffect(() => {
    load()
  }, [load])

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim() || !token) return
    setSubmitting(true)
    const success = await askQuestion(token, { courseId, subSectionId, title: title.trim(), body: body.trim() })
    if (success) {
      setTitle("")
      setBody("")
      setAsking(false)
      load()
    }
    setSubmitting(false)
  }

  return (
    <div className="mt-6 rounded-md border border-richblack-700 bg-richblack-800 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-richblack-5">Q&A</h3>
        <button
          type="button"
          onClick={() => setAsking((prev) => !prev)}
          className="text-sm font-semibold text-yellow-50"
        >
          {asking ? "Cancel" : "Ask a question"}
        </button>
      </div>

      {asking && (
        <form onSubmit={handleAsk} className="mb-6 flex flex-col gap-3 border-b border-richblack-700 pb-6">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Question title"
            className="form-style"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Details..."
            className="form-style min-h-[100px]"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-yellow-50 px-4 py-2 font-semibold text-ink"
            >
              {submitting ? "Posting..." : "Post question"}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-6">
        {questions.length === 0 && !asking && (
          <p className="text-sm text-richblack-300">No questions for this lecture yet. Be the first!</p>
        )}
        {questions.map((question) => (
          <div key={question._id} className="flex flex-col gap-1 border-b border-richblack-700 pb-4 last:border-b-0 last:pb-0">
            <h4 className="font-semibold text-richblack-5">{question.title}</h4>
            <p className="text-xs text-richblack-300">
              Asked by {question.askedBy?.firstName} {question.askedBy?.lastName}
            </p>
            <p className="mt-2 text-sm text-richblack-100">{question.body}</p>

            {question.answers.length > 0 && (
              <div className="mt-4 flex flex-col gap-3 pl-4 border-l-2 border-richblack-700">
                {question.answers.map((answer) => (
                  <div key={answer._id}>
                    <p className="text-xs text-richblack-300 mb-1">
                      {answer.answeredBy?.firstName} {answer.answeredBy?.lastName}
                    </p>
                    <p className="text-sm text-richblack-200">{answer.text}</p>
                  </div>
                ))}
              </div>
            )}

            {replyingTo === question._id ? (
              <AnswerForm
                questionId={question._id}
                token={token}
                onAnswered={() => {
                  setReplyingTo(null)
                  load()
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setReplyingTo(question._id)}
                className="mt-2 text-xs text-yellow-50 hover:underline flex self-start"
              >
                Reply
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
