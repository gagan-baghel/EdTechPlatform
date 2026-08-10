"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"

import { askQuestion, answerQuestion, fetchQuestionsForLecture } from "../../../services/operations/qnaAPI"
import { formatDate } from "../../../services/formatDate"
import Spinner from "../../common/Spinner"

function AnswerForm({ questionId, token, onAnswered }) {
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    const updated = await answerQuestion(token, questionId, text.trim())
    if (updated) {
      setText("")
      onAnswered(updated)
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a reply..."
        className="form-style flex-1 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md border border-richblack-500 px-3 text-xs text-richblack-200 hover:text-richblack-5"
      >
        Reply
      </button>
    </form>
  )
}

// Per-lecture discussion — scoped to the subsection currently playing, not
// the whole course, so a question stays attached to the exact moment it's
// about.
export default function QnAPanel({ courseId, subSectionId }) {
  const { token } = useSelector((state) => state.auth)
  const [questions, setQuestions] = useState(null)
  const [newQuestion, setNewQuestion] = useState("")
  const [replyingTo, setReplyingTo] = useState(null)

  const load = async () => {
    const result = await fetchQuestionsForLecture(token, subSectionId)
    setQuestions(result)
  }

  useEffect(() => {
    if (subSectionId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subSectionId])

  const handleAsk = async (e) => {
    e.preventDefault()
    if (!newQuestion.trim()) return
    const question = await askQuestion(token, {
      courseId,
      subSectionId,
      text: newQuestion.trim(),
    })
    if (question) {
      setNewQuestion("")
      load()
    }
  }

  if (!questions) return <Spinner />

  return (
    <div className="mt-8">
      <h3 className="mb-3 text-lg font-semibold text-richblack-5">Questions about this lecture</h3>

      <form onSubmit={handleAsk} className="mb-4 flex gap-2">
        <input
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Ask a question about this lecture..."
          className="form-style flex-1"
        />
        <button type="submit" className="rounded-md bg-yellow-50 px-4 py-2 text-sm font-semibold text-ink">
          Ask
        </button>
      </form>

      <div className="flex flex-col gap-4">
        {questions.length === 0 && <p className="text-sm text-richblack-400">No questions yet — be the first.</p>}
        {questions.map((question) => (
          <div key={question._id} className="rounded-md border border-richblack-700 bg-richblack-800 p-4">
            <p className="text-sm font-semibold text-richblack-5">
              {question.askedBy?.firstName} {question.askedBy?.lastName}
            </p>
            <p className="mt-1 text-richblack-100">{question.text}</p>
            <p className="mt-1 text-xs text-richblack-500">{formatDate(question.createdAt)}</p>

            {question.answers?.length > 0 && (
              <div className="mt-3 flex flex-col gap-2 border-l-2 border-richblack-600 pl-4">
                {question.answers.map((answer, i) => (
                  <div key={i}>
                    <p className="text-sm font-semibold text-richblack-100">
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
                className="mt-2 text-xs text-yellow-50 hover:underline"
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
