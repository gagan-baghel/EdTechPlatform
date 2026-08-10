import type { Types } from "mongoose"

import type { AiInteractionType } from "@/types/domain"
import { toErrorMessage } from "../lib/AppError"
import AIInteraction from "../models/AIInteraction"

// Per-user daily cap (plan §6: "an unbounded tutor is an unbounded bill —
// enforce before launch"). One number for both interaction types; a real
// deployment would likely split tutor vs. copilot budgets, but a single
// ceiling is the honest v1 rather than premature tiering nobody asked for.
export const DAILY_AI_INTERACTION_CAP = 30

export async function checkDailyCap(
  userId: Types.ObjectId | string
): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const count = await AIInteraction.countDocuments({
    user: userId,
    createdAt: { $gte: since },
  })
  return count < DAILY_AI_INTERACTION_CAP
}

export interface AiInteractionLog {
  user: Types.ObjectId | string
  type: AiInteractionType
  model: string
  promptVersion: string
  input: string
  output?: string
  subSection?: Types.ObjectId | string | null
  succeeded: boolean
  errorMessage?: string | null
}

export async function logAIInteraction({
  user,
  type,
  model,
  promptVersion,
  input,
  output,
  subSection,
  succeeded,
  errorMessage,
}: AiInteractionLog): Promise<void> {
  try {
    await AIInteraction.create({
      user,
      type,
      model,
      promptVersion,
      input,
      output: output || "",
      subSection: subSection || null,
      succeeded,
      errorMessage: errorMessage || null,
    })
  } catch (error) {
    console.error("logAIInteraction failed", toErrorMessage(error))
  }
}
