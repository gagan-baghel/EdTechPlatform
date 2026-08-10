const AIInteraction = require("../models/AIInteraction")

// Per-user daily cap (plan §6: "an unbounded tutor is an unbounded bill —
// enforce before launch"). One number for both interaction types; a real
// deployment would likely split tutor vs. copilot budgets, but a single
// ceiling is the honest v1 rather than premature tiering nobody asked for.
const DAILY_AI_INTERACTION_CAP = 30

async function checkDailyCap(userId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const count = await AIInteraction.countDocuments({ user: userId, createdAt: { $gte: since } })
  return count < DAILY_AI_INTERACTION_CAP
}

async function logAIInteraction({ user, type, model, promptVersion, input, output, subSection, succeeded, errorMessage }) {
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
    console.error("logAIInteraction failed", error.message)
  }
}

module.exports = { checkDailyCap, logAIInteraction, DAILY_AI_INTERACTION_CAP }
