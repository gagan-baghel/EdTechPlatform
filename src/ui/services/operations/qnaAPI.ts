import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { qnaEndpoints } from "../apis"

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` })

export async function fetchQuestionsForLecture(token: string, subSectionId: string) {
  try {
    const response = await apiConnector("GET", qnaEndpoints.LIST_QUESTIONS_API(subSectionId), null, authHeader(token))
    return response.data?.success ? response.data.data : []
  } catch {
    return []
  }
}

export async function askQuestion(token: string, payload: Record<string, unknown>) {
  try {
    const response = await apiConnector("POST", qnaEndpoints.ASK_QUESTION_API, payload, authHeader(token))
    if (!response.data?.success) throw new Error("Could not post question")
    return response.data.data
  } catch {
    toast.error("Could not post your question")
    return null
  }
}

export async function answerQuestion(token: string, questionId: string, text: string) {
  try {
    const response = await apiConnector(
      "POST",
      qnaEndpoints.ANSWER_QUESTION_API(questionId),
      { text },
      authHeader(token)
    )
    if (!response.data?.success) throw new Error("Could not post answer")
    return response.data.data
  } catch {
    toast.error("Could not post your answer")
    return null
  }
}

export async function deleteQuestion(token: string, questionId: string) {
  try {
    await apiConnector("DELETE", qnaEndpoints.DELETE_QUESTION_API(questionId), null, authHeader(token))
    return true
  } catch {
    toast.error("Could not delete question")
    return false
  }
}
