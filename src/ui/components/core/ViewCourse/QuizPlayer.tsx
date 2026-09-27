"use client"

import React, { useState } from "react"
import { useSelector } from "react-redux"

import { submitQuizAttempt } from "../../../services/operations/quizAPI"
import Button from "../../common/Button"
import QuizReview, { type ReviewItem } from "./QuizReview"
import type { RootState } from "../../../store"

/** What the server returns after grading an attempt. */
export interface QuizAttemptResult {
  scorePercent: number
  passed: boolean
  passingScorePercent: number
  attemptsUsed: number
  attemptsAllowed: number
  /** Null until the student passes or runs out of attempts. */
  review: ReviewItem[] | null
}

export interface QuizQuestion {
  _id: string
  questionText: string
  options: string[]
}

export interface QuizData {
  _id: string
  title: string
  questions: QuizQuestion[]
}

interface QuizPlayerProps {
  quiz: QuizData
  onClose: () => void
  onCompleted?: (result: QuizAttemptResult) => void
}

export default function QuizPlayer({ quiz, onClose, onCompleted }: QuizPlayerProps) {
  const { token } = useSelector((state: RootState) => state.auth)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<QuizAttemptResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSelect = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
  }

  const handleSubmit = async () => {
    if (!token) return
    setSubmitting(true)
    const payload = Object.entries(answers).map(([questionId, selectedOptionIndex]) => ({
      questionId,
      selectedOptionIndex,
    }))
    const response = await submitQuizAttempt<QuizAttemptResult>(token, quiz._id, payload)
    if (response?.data) {
      setResult(response.data)
      onCompleted?.(response.data)
    }
    setSubmitting(false)
  }

  return (
    <div className="rounded-md border border-richblack-700 bg-richblack-800 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-richblack-5">{quiz.title}</h3>
        <button type="button" onClick={onClose} className="text-richblack-300 hover:text-richblack-5">
          Close
        </button>
      </div>

      {result ? (
        <div>
          <p className={`text-2xl font-bold ${result.passed ? "text-caribbeangreen-100" : "text-pink-200"}`}>
            {result.scorePercent}% — {result.passed ? "Passed" : "Not passed"}
          </p>
          <p className="mt-2 text-sm text-richblack-300">
            Passing score: {result.passingScorePercent}% · Attempt {result.attemptsUsed} of {result.attemptsAllowed}
          </p>
          {result.review ? (
            <div className="mt-6">
              <h4 className="mb-3 font-semibold text-richblack-5">Your answers</h4>
              <QuizReview items={result.review} />
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-richblack-300">
                The answer review unlocks once you pass or use every attempt.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setResult(null)
                  setAnswers({})
                }}
              >
                Try again
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-6">
            {quiz.questions.map((question) => (
              <div key={question._id}>
                <p className="mb-2 font-medium text-richblack-5">{question.questionText}</p>
                <div className="flex flex-col gap-2">
                  {question.options.map((option, index) => (
                    <label key={index} className="flex items-center gap-2 text-richblack-100">
                      <input
                        type="radio"
                        name={question._id}
                        checked={answers[question._id] === index}
                        onChange={() => handleSelect(question._id, index)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Button
            className="mt-6"
            disabled={submitting || Object.keys(answers).length < quiz.questions.length}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting..." : "Submit answers"}
          </Button>
        </>
      )}
    </div>
  )
}
