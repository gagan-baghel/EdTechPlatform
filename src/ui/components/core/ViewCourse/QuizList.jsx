"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"

import { fetchQuizzesForCourseStudent, fetchQuizForStudent } from "../../../services/operations/quizAPI"
import QuizPlayer from "./QuizPlayer"
import Spinner from "../../common/Spinner"

// Shown in the course player — lists any course-level quizzes (not tied
// to a specific lecture) so a student can take the final assessment
// without hunting for it. Lecture-scoped quizzes aren't listed here; they
// belong next to the lecture they check, not in one flat list.
export default function QuizList({ courseId }) {
  const { token } = useSelector((state) => state.auth)
  const [quizzes, setQuizzes] = useState(null)
  const [activeQuiz, setActiveQuiz] = useState(null)

  useEffect(() => {
    if (!courseId) return
    ;(async () => {
      const result = await fetchQuizzesForCourseStudent(token, courseId)
      if (result) setQuizzes(result.data.filter((q) => !q.subSection))
    })()
  }, [courseId, token])

  const handleOpen = async (quizId) => {
    const result = await fetchQuizForStudent(token, quizId)
    if (result) setActiveQuiz(result.data)
  }

  if (!quizzes) return <Spinner />
  if (quizzes.length === 0) return null

  return (
    <div className="mt-6">
      <h3 className="mb-3 text-lg font-semibold text-richblack-5">Course quizzes</h3>
      {activeQuiz ? (
        <QuizPlayer quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />
      ) : (
        <div className="flex flex-col gap-2">
          {quizzes.map((quiz) => (
            <button
              key={quiz._id}
              type="button"
              onClick={() => handleOpen(quiz._id)}
              className="flex items-center justify-between rounded-md border border-richblack-700 bg-richblack-800 px-4 py-3 text-left hover:bg-richblack-700"
            >
              <span className="text-richblack-5">{quiz.title}</span>
              <span className="text-sm text-richblack-300">{quiz.questionCount} question(s)</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
