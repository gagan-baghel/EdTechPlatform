import axios from "axios"

import type { ApiFailure } from "@/types/api"

/**
 * Pulls the server's user-facing message out of a failed request.
 *
 * The pattern this replaces was `error?.response?.data?.message || fallback`,
 * hand-written at ~15 call sites and typed `any` at every one. Under
 * `useUnknownInCatchVariables` a caught value is `unknown`, which is correct —
 * a rejected axios promise, a thrown Error, and a string are all possible
 * here, and only one of them has `.response`.
 *
 * The server's 5xx responses already carry a safe generic message (see
 * `src/api/lib/respond.ts`), so showing `message` verbatim cannot leak
 * internals; the redaction happens on the server, not here.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiFailure>(error)) {
    const message = error.response?.data?.message
    if (typeof message === "string" && message) return message
    // No response body at all means the request never completed.
    if (!error.response) return "Network error. Please check your connection."
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

/** Field-level validation errors, when the server sent them. */
export function getApiFieldErrors(
  error: unknown
): Record<string, string[]> | undefined {
  if (axios.isAxiosError<ApiFailure>(error)) {
    return error.response?.data?.fieldErrors
  }
  return undefined
}
