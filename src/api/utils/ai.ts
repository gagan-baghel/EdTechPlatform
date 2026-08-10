/**
 * Thin wrappers around two provider APIs, called with plain fetch (Node 20
 * has fetch/FormData/Blob built in — no SDK dependency for this). Both
 * functions throw a clear, typed error when their key is unset, which
 * every caller in this file is expected to catch and degrade from —
 * these AI features are additive to a platform that fully works without
 * them, never a hard dependency.
 */
import { getEnv } from "../config/env"

export class AIConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AIConfigError"
  }
}

/**
 * Hosts this server is willing to fetch media from.
 *
 * `transcribeAudioUrl` takes a URL out of the database and fetches it
 * server-side. That value originates from an instructor-supplied upload
 * response, so without this check the endpoint is a server-side request
 * forgery primitive: point `videoUrl` at http://169.254.169.254/ (cloud
 * metadata) or at an internal address and the server fetches it, from
 * inside the trust boundary, with the result flowing into the transcript.
 *
 * Cloudinary is the only place this app ever stores media, so an allowlist
 * costs nothing and closes the hole completely.
 */
const ALLOWED_MEDIA_HOSTS = new Set(["res.cloudinary.com"])

function assertFetchableMediaUrl(rawUrl: string): URL {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error("Media URL is not a valid URL")
  }

  if (url.protocol !== "https:") {
    throw new Error("Media URL must use https")
  }
  if (!ALLOWED_MEDIA_HOSTS.has(url.hostname)) {
    throw new Error("Media URL host is not allowed")
  }
  return url
}

/**
 * OpenAI Whisper — speech-to-text. This is the one piece of the AI
 * substrate with no reasonable Anthropic-only alternative (Anthropic
 * doesn't do STT), so transcription specifically needs OPENAI_API_KEY
 * even if the tutor/copilot below run on Anthropic.
 */
export async function transcribeAudioUrl(audioUrl: string): Promise<string> {
  const apiKey = getEnv().OPENAI_API_KEY
  if (!apiKey) {
    throw new AIConfigError("OPENAI_API_KEY is not configured")
  }

  const safeUrl = assertFetchableMediaUrl(audioUrl)

  const audioResponse = await fetch(safeUrl, { redirect: "error" })
  if (!audioResponse.ok) {
    throw new Error(
      `Could not fetch audio for transcription: ${audioResponse.status}`
    )
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

  // Upstream JSON is untrusted input like any other — narrow it rather than
  // asserting a shape and hoping.
  const data: unknown = await response.json()
  const text = (data as { text?: unknown } | null)?.text
  return typeof text === "string" ? text : ""
}

export interface GenerateTextOptions {
  /** Grounding/governance instructions: citation requirement, scope limits. */
  system: string
  /** The user's actual question or request. */
  prompt: string
  maxTokens?: number
}

/**
 * Anthropic Messages API for the tutor and instructor copilot.
 */
export async function generateText({
  system,
  prompt,
  maxTokens = 1024,
}: GenerateTextOptions): Promise<string> {
  const env = getEnv()
  if (!env.ANTHROPIC_API_KEY) {
    throw new AIConfigError("ANTHROPIC_API_KEY is not configured")
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`AI generation failed: ${response.status} ${errorText}`)
  }

  const data: unknown = await response.json()
  const firstBlock = (data as { content?: Array<{ text?: unknown }> } | null)
    ?.content?.[0]
  return typeof firstBlock?.text === "string" ? firstBlock.text : ""
}
