import type { ApiFailure } from "@/types/api"
import type { DataBody } from "../../types"
import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { quizEndpoints } from "../apis"

const {
  QUIZ_BASE_API,
  QUIZ_COURSE_INSTRUCTOR_API,
  QUIZ_COURSE_STUDENT_API,
  QUIZ_DETAIL_API,
  QUIZ_SUBMIT_API,
  QUIZ_MY_ATTEMPTS_API,
} = quizEndpoints

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` })

export async function createQuiz(token: string, payload: Record<string, unknown>) {
  try {
    const response = await apiConnector("POST", QUIZ_BASE_API, payload, authHeader(token))
    toast.success("Quiz created")
    return response.data.success ? response.data : null
  } catch (error) {
    toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not create quiz")
    return null
  }
}

export async function updateQuiz(token: string, quizId: string, payload: Record<string, unknown>) {
  try {
    const response = await apiConnector("PATCH", QUIZ_DETAIL_API(quizId), payload, authHeader(token))
    toast.success("Quiz updated")
    return response.data.success ? response.data : null
  } catch {
    toast.error("Could not update quiz")
    return null
  }
}

export async function deleteQuiz(token: string, quizId: string) {
  try {
    await apiConnector("DELETE", QUIZ_DETAIL_API(quizId), null, authHeader(token))
    toast.success("Quiz deleted")
    return true
  } catch {
    toast.error("Could not delete quiz")
    return false
  }
}

export async function fetchQuizzesForCourseInstructor<TQuiz = Record<string, unknown>>(
  token: string,
  courseId: string
) {
  try {
    const response = await apiConnector<DataBody<TQuiz[]> | ApiFailure>(
      "GET", QUIZ_COURSE_INSTRUCTOR_API(courseId), null, authHeader(token))
    return response.data.success ? response.data : null
  } catch {
    toast.error("Could not load quizzes")
    return null
  }
}

export async function fetchQuizzesForCourseStudent<TQuiz = Record<string, unknown>>(
  token: string,
  courseId: string
) {
  try {
    const response = await apiConnector<DataBody<TQuiz[]> | ApiFailure>(
      "GET", QUIZ_COURSE_STUDENT_API(courseId), null, authHeader(token))
    return response.data.success ? response.data : null
  } catch {
    return null
  }
}

export async function fetchQuizForStudent<TQuiz = Record<string, unknown>>(
  token: string,
  quizId: string
) {
  try {
    const response = await apiConnector<DataBody<TQuiz> | ApiFailure>(
      "GET", QUIZ_DETAIL_API(quizId), null, authHeader(token))
    return response.data.success ? response.data : null
  } catch {
    toast.error("Could not load quiz")
    return null
  }
}

export interface QuizAnswer {
  questionId: string
  selectedOptionIndex: number
}

export async function submitQuizAttempt<TResult = Record<string, unknown>>(
  token: string,
  quizId: string,
  answers: QuizAnswer[]
) {
  try {
    const response = await apiConnector<DataBody<TResult> | ApiFailure>(
      "POST", QUIZ_SUBMIT_API(quizId), { answers }, authHeader(token))
    return response.data.success ? response.data : null
  } catch {
    toast.error("Could not submit quiz")
    return null
  }
}

export async function fetchMyQuizAttempts(token: string, quizId: string) {
  try {
    const response = await apiConnector("GET", QUIZ_MY_ATTEMPTS_API(quizId), null, authHeader(token))
    return response.data.success ? response.data : null
  } catch {
    return null
  }
}
