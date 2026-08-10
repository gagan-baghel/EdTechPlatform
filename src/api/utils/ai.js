/**
 * Thin wrappers around two provider APIs, called with plain fetch (Node 20
 * has fetch/FormData/Blob built in — no SDK dependency for this). Both
 * functions throw a clear, typed error when their key is unset, which
 * every caller in this file is expected to catch and degrade from —
 * these AI features are additive to a platform that fully works without
 * them, never a hard dependency.
 */

class AIConfigError extends Error {
  constructor(message) {
    super(message)
    this.name = "AIConfigError"
  }
}

/**
 * OpenAI Whisper — speech-to-text. This is the one piece of the AI
 * substrate with no reasonable Anthropic-only alternative (Anthropic
 * doesn't do STT), so transcription specifically needs OPENAI_API_KEY
 * even if the tutor/copilot below run on Anthropic.
 */
async function transcribeAudioUrl(audioUrl) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new AIConfigError("OPENAI_API_KEY is not configured")
  }

  const audioResponse = await fetch(audioUrl)
  if (!audioResponse.ok) {
    throw new Error(`Could not fetch audio for transcription: ${audioResponse.status}`)
  }
  const audioBlob = await audioResponse.blob()

  const formData = new FormData()
  formData.append("file", audioBlob, "lecture.mp3")
  formData.append("model", "whisper-1")
  formData.append("response_format", "json")

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`Whisper transcription failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.text
}

/**
 * Anthropic Messages API for the tutor and instructor copilot. system
 * carries the grounding/governance instructions (citation requirement,
 * scope), prompt is the user's actual question/request.
 */
async function generateText({ system, prompt, maxTokens = 1024 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new AIConfigError("ANTHROPIC_API_KEY is not configured")
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`AI generation failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ""
}

module.exports = { transcribeAudioUrl, generateText, AIConfigError }
