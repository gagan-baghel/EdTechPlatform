"use client"
import type { ModalData } from "@/ui/components/common/ConfirmationModal"

import { useEffect, useState, useCallback } from "react"
import { useSelector } from "react-redux"

import {
  createQuiz,
  deleteQuiz,
  fetchQuizzesForCourseInstructor,
  updateQuiz,
} from "../../../../../services/operations/quizAPI"
import Button from "../../../../common/Button"
import Input from "../../../../common/Input"
import Card from "../../../../common/Card"
import ConfirmationModal from "../../../../common/ConfirmationModal"
import type { RootState } from "../../../../../store"

interface QuizQuestion {
  questionText: string
  options: string[]
  correctOptionIndex: number
}

interface Quiz {
  _id: string
  title: string
  questions: QuizQuestion[]
  passingScorePercent: number
  published: boolean
}

const emptyQuestion = (): QuizQuestion => ({ questionText: "", options: ["", ""], correctOptionIndex: 0 })

interface QuizManagerProps {
  courseId: string
}

export default function QuizManager({ courseId }: QuizManagerProps) {
  const { token } = useSelector((state: RootState) => state.auth)
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null)
  const [title, setTitle] = useState("")
  const [questions, setQuestions] = useState<QuizQuestion[]>([emptyQuestion()])
  const [confirmationModal, setConfirmationModal] = useState<ModalData | null>(null)

  const load = useCallback(() => {
    return fetchQuizzesForCourseInstructor<Quiz>(token as string, courseId).then((result) => {
      if (result) setQuizzes(result.data)
    })
  }, [token, courseId])

  useEffect(() => {
    if (courseId) load()
  }, [courseId, load])

  const addQuestion = () => setQuestions((qs) => [...qs, emptyQuestion()])
  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) =>
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  const updateOption = (qIndex: number, oIndex: number, value: string) =>
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q
      )
    )
  const addOption = (qIndex: number) =>
    setQuestions((qs) => qs.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, ""] } : q)))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = questions.filter((q) => q.questionText.trim() && q.options.every((o) => o.trim()))
    if (!title.trim() || cleaned.length === 0) {
      return
    }
    const result = await createQuiz(token as string, { courseId, title, questions: cleaned })
    if (result) {
      setTitle("")
      setQuestions([emptyQuestion()])
      await load()
    }
  }

  const handleTogglePublish = async (quiz: Quiz) => {
    await updateQuiz(token as string, quiz._id, { published: !quiz.published })
    await load()
  }

  const handleDelete = async (quizId: string) => {
    await deleteQuiz(token as string, quizId)
    setConfirmationModal(null)
    await load()
  }

  return (
    <div className="mt-10">
      <h2 className="mb-4 text-xl font-semibold text-richblack-5">Quizzes</h2>

      {quizzes && quizzes.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          {quizzes.map((quiz) => (
            <Card key={quiz._id} padding="p-4" className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-richblack-5">{quiz.title}</p>
                <p className="text-xs text-richblack-300">
                  {quiz.questions.length} question(s) — pass at {quiz.passingScorePercent}% —{" "}
                  {quiz.published ? "Published" : "Draft"}
                </p>
              </div>
              <div className="flex gap-3">
                <Button size="sm" variant="secondary" onClick={() => handleTogglePublish(quiz)}>
                  {quiz.published ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    setConfirmationModal({
                      text1: "Delete this quiz?",
                      text2: "Students' attempt history for it will also be removed.",
                      btn1Text: "Delete",
                      btn2Text: "Cancel",
                      btn1Handler: () => handleDelete(quiz._id),
                      btn2Handler: () => setConfirmationModal(null),
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card padding="p-5">
        <h3 className="mb-4 font-semibold text-richblack-5">New quiz</h3>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input placeholder="Quiz title" value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />

          {questions.map((q, qIndex) => (
            <div key={qIndex} className="rounded-md border border-richblack-600 p-4">
              <Input
                placeholder={`Question ${qIndex + 1}`}
                value={q.questionText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateQuestion(qIndex, { questionText: e.target.value })}
                className="mb-3"
              />
              {q.options.map((option, oIndex) => (
                <div key={oIndex} className="mb-2 flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qIndex}`}
                    checked={q.correctOptionIndex === oIndex}
                    onChange={() => updateQuestion(qIndex, { correctOptionIndex: oIndex })}
                    aria-label={`Mark option ${oIndex + 1} as correct`}
                  />
                  <Input
                    placeholder={`Option ${oIndex + 1}`}
                    value={option}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(qIndex, oIndex, e.target.value)}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOption(qIndex)}
                className="text-sm font-semibold text-yellow-50"
              >
                + Add option
              </button>
            </div>
          ))}

          <div className="flex justify-between">
            <button type="button" onClick={addQuestion} className="text-sm font-semibold text-yellow-50">
              + Add question
            </button>
            <Button type="submit">Create quiz (draft)</Button>
          </div>
        </form>
      </Card>

      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </div>
  )
}
