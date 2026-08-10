import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { qnaEndpoints } from "../apis"

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

export async function fetchQuestionsForLecture(token, subSectionId) {
  try {
    const response = await apiConnector("GET", qnaEndpoints.LIST_QUESTIONS_API(subSectionId), null, authHeader(token))
    return response.data?.success ? response.data.data : []
  } catch (error) {
    return []
  }
}

export async function askQuestion(token, payload) {
  try {
    const response = await apiConnector("POST", qnaEndpoints.ASK_QUESTION_API, payload, authHeader(token))
    if (!response.data?.success) throw new Error("Could not post question")
    return response.data.data
  } catch (error) {
    toast.error("Could not post your question")
    return null
  }
}

export async function answerQuestion(token, questionId, text) {
  try {
    const response = await apiConnector(
      "POST",
      qnaEndpoints.ANSWER_QUESTION_API(questionId),
      { text },
      authHeader(token)
    )
    if (!response.data?.success) throw new Error("Could not post answer")
    return response.data.data
  } catch (error) {
    toast.error("Could not post your answer")
    return null
  }
}

export async function deleteQuestion(token, questionId) {
  try {
    await apiConnector("DELETE", qnaEndpoints.DELETE_QUESTION_API(questionId), null, authHeader(token))
    return true
  } catch (error) {
    toast.error("Could not delete question")
    return false
  }
}
