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

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

export async function createQuiz(token, payload) {
  try {
    const response = await apiConnector("POST", QUIZ_BASE_API, payload, authHeader(token))
    toast.success("Quiz created")
    return response.data
  } catch (error) {
    toast.error(error?.response?.data?.message || "Could not create quiz")
    return null
  }
}

export async function updateQuiz(token, quizId, payload) {
  try {
    const response = await apiConnector("PATCH", QUIZ_DETAIL_API(quizId), payload, authHeader(token))
    toast.success("Quiz updated")
    return response.data
  } catch (error) {
    toast.error("Could not update quiz")
    return null
  }
}

export async function deleteQuiz(token, quizId) {
  try {
    await apiConnector("DELETE", QUIZ_DETAIL_API(quizId), null, authHeader(token))
    toast.success("Quiz deleted")
    return true
  } catch (error) {
    toast.error("Could not delete quiz")
    return false
  }
}

export async function fetchQuizzesForCourseInstructor(token, courseId) {
  try {
    const response = await apiConnector("GET", QUIZ_COURSE_INSTRUCTOR_API(courseId), null, authHeader(token))
    return response.data
  } catch (error) {
    toast.error("Could not load quizzes")
    return null
  }
}

export async function fetchQuizzesForCourseStudent(token, courseId) {
  try {
    const response = await apiConnector("GET", QUIZ_COURSE_STUDENT_API(courseId), null, authHeader(token))
    return response.data
  } catch (error) {
    return null
  }
}

export async function fetchQuizForStudent(token, quizId) {
  try {
    const response = await apiConnector("GET", QUIZ_DETAIL_API(quizId), null, authHeader(token))
    return response.data
  } catch (error) {
    toast.error("Could not load quiz")
    return null
  }
}

export async function submitQuizAttempt(token, quizId, answers) {
  try {
    const response = await apiConnector("POST", QUIZ_SUBMIT_API(quizId), { answers }, authHeader(token))
    return response.data
  } catch (error) {
    toast.error("Could not submit quiz")
    return null
  }
}

export async function fetchMyQuizAttempts(token, quizId) {
  try {
    const response = await apiConnector("GET", QUIZ_MY_ATTEMPTS_API(quizId), null, authHeader(token))
    return response.data
  } catch (error) {
    return null
  }
}
