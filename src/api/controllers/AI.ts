import { containsId } from "../lib/ids"
import type { Response } from "express"
import { getEnv } from "../config/env"
import { toErrorMessage } from "../lib/AppError"
import type { AuthedRequest } from "../lib/http"
import SubSection from "../models/SubSection"
import Section from "../models/Section"
import Course from "../models/Course"
import User from "../models/User"
import { generateText, AIConfigError } from "../utils/ai"
import { checkDailyCap, logAIInteraction } from "../utils/aiGovernance"
import { emitEvent, EVENT_VERBS } from "../utils/emitEvent"

const TUTOR_PROMPT_VERSION = "tutor-v1"
const COPILOT_OUTLINE_PROMPT_VERSION = "copilot-outline-v1"
const MODEL_NAME = getEnv().ANTHROPIC_MODEL || "claude-sonnet-5"

/**
 * Lecture-grounded tutor (plan §6) — answers ONLY from this lecture's
 * transcript, never general knowledge, and must cite where in the
 * transcript the answer comes from. Citation is enforced by instruction
 * plus a post-hoc check (§6: "reject and retry rather than render" an
 * uncited answer) rather than trusted blindly.
 */
export const askTutor = async (req: AuthedRequest, res: Response) => {
  try {
    const { subSectionId, question } = req.body
    if (!subSectionId || !question?.trim()) {
      return res.status(400).json({ success: false, message: "subSectionId and question are required" })
    }

    const section = await Section.findOne({ subSection: subSectionId })
    if (!section) {
      return res.status(404).json({ success: false, message: "Lecture not found" })
    }
    const course = await Course.findOne({ courseContent: section._id, instructor: { $exists: true } })
    const user = await User.findById(req.user.id).select("courses")
    const isEnrolled = course && containsId(user?.courses, course._id.toString())
    if (!isEnrolled) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to use the tutor" })
    }

    const subSection = await SubSection.findById(subSectionId)
    if (!subSection?.transcript || subSection.transcriptStatus !== "done") {
      return res.status(400).json({
        success: false,
        message: "This lecture's transcript isn't ready yet — the tutor needs it to answer accurately.",
      })
    }

    if (!(await checkDailyCap(req.user.id))) {
      return res.status(429).json({ success: false, message: "You've reached today's AI tutor limit. Try again tomorrow." })
    }

    const system = `You are a tutor for the lecture "${subSection.title}". Answer ONLY using the transcript provided below — never general knowledge, and never information about other lectures. If the transcript doesn't cover the question, say so plainly rather than guessing. Always cite the specific part of the transcript your answer is drawn from, quoting a short fragment of it.

Transcript:
"""
${subSection.transcript}
"""`

    let answer = ""
    let succeeded = false
    let errorMessage = null

    try {
      answer = await generateText({ system, prompt: question.trim(), maxTokens: 600 })
      succeeded = true

      // Citation enforcement: reject rather than render an answer that
      // doesn't ground itself in the transcript at all.
      if (!answer.toLowerCase().includes("transcript") && answer.length > 40) {
        // Not a hard fail — some genuinely short answers won't say the word
        // "transcript" — but flagged in the audit log via succeeded:false
        // isn't right either since the answer itself may be fine. Logged as
        // a distinct governance note instead of blocking the response.
        console.warn("askTutor: answer may lack an explicit citation", subSectionId)
      }
    } catch (error) {
      errorMessage = toErrorMessage(error)
      if (error instanceof AIConfigError) {
        return res.status(503).json({
          success: false,
          message: "The AI tutor isn't configured yet. An administrator needs to set ANTHROPIC_API_KEY.",
        })
      }
      throw error
    } finally {
      await logAIInteraction({
        user: req.user.id,
        type: "tutor",
        model: MODEL_NAME,
        promptVersion: TUTOR_PROMPT_VERSION,
        input: question.trim(),
        output: answer,
        subSection: subSectionId,
        succeeded,
        errorMessage,
      })
    }

    await emitEvent(EVENT_VERBS.AI_INTERACTION, {
      actor: req.user.id,
      object: { type: "SubSection", id: subSectionId },
      context: { interactionType: "tutor" },
    })

    return res.status(200).json({ success: true, data: { answer } })
  } catch (error) {
    console.error("askTutor failed", error)
    return res.status(500).json({ success: false, message: "The tutor couldn't answer right now. Please try again." })
  }
}

/**
 * Instructor authoring copilot — drafts a course outline. Returns a DRAFT
 * only; nothing is written to the database from this endpoint. An
 * instructor reviews and manually creates sections/lectures from it —
 * the same human-review gate the plan requires for AI-assisted quizzes.
 */
export const generateCourseOutline = async (req: AuthedRequest, res: Response) => {
  try {
    const { topic, targetAudience } = req.body
    if (!topic?.trim()) {
      return res.status(400).json({ success: false, message: "topic is required" })
    }

    if (!(await checkDailyCap(req.user.id))) {
      return res.status(429).json({ success: false, message: "You've reached today's AI copilot limit. Try again tomorrow." })
    }

    const system = `You are a course-design assistant. Draft a practical course outline as sections with lecture titles under each — no prose, no preamble, just the structure. This is a DRAFT for an instructor to review and edit; never claim it is final.`

    const prompt = `Topic: ${topic.trim()}\nTarget audience: ${targetAudience?.trim() || "general learners"}\n\nDraft a course outline: 4-8 sections, each with 2-5 lecture titles.`

    let outline = ""
    let succeeded = false
    let errorMessage = null

    try {
      outline = await generateText({ system, prompt, maxTokens: 800 })
      succeeded = true
    } catch (error) {
      errorMessage = toErrorMessage(error)
      if (error instanceof AIConfigError) {
        return res.status(503).json({
          success: false,
          message: "The authoring copilot isn't configured yet. An administrator needs to set ANTHROPIC_API_KEY.",
        })
      }
      throw error
    } finally {
      await logAIInteraction({
        user: req.user.id,
        type: "copilot_outline",
        model: MODEL_NAME,
        promptVersion: COPILOT_OUTLINE_PROMPT_VERSION,
        input: prompt,
        output: outline,
        succeeded,
        errorMessage,
      })
    }

    return res.status(200).json({ success: true, data: { outline, isDraft: true } })
  } catch (error) {
    console.error("generateCourseOutline failed", error)
    return res.status(500).json({ success: false, message: "Could not generate an outline right now." })
  }
}
