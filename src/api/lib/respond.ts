import type { Response } from "express"
import type { ZodError, ZodType } from "zod"

import type { ApiFailure, ApiSuccess, Paginated } from "@/types/api"
import { AppError, isAppError, isDuplicateKeyError } from "./AppError"

/**
 * Every response body in the API is built here.
 *
 * The point is not tidiness — it is that `fail()` is the only function that
 * turns a caught `unknown` into a string a user sees, so there is exactly one
 * place to be sure a stack trace, a Mongo error, or a connection string can't
 * leak into a response. Controllers throw; this decides what is safe to say.
 */

export function ok<TData>(
  res: Response,
  data: TData,
  message?: string,
  status = 200
): Response {
  const body: ApiSuccess<TData> = { success: true, data }
  if (message) body.message = message
  return res.status(status).json(body)
}

/** For endpoints that only acknowledge — no payload to return. */
export function okMessage(res: Response, message: string, status = 200): Response {
  return res.status(status).json({ success: true, data: undefined, message })
}

export function okPaginated<TItem>(
  res: Response,
  page: Paginated<TItem>,
  message?: string
): Response {
  return ok(res, page, message)
}

/**
 * Converts any thrown value into a safe response, and logs what it hid.
 *
 * `context` is a short label for the log line (usually the controller name) —
 * it is written to stdout, never to the response.
 */
export function fail(
  res: Response,
  error: unknown,
  context: string,
  /**
   * A user-safe message to show for a 5xx instead of the generic one.
   *
   * Exists because several controllers paired a genuinely useful sentence
   * ("Failed to create course") with a leaked `error.message`. Dropping the
   * leak shouldn't also cost the useful half — but only strings written here
   * in source ever reach a client; a caught error's own message never does.
   */
  publicMessage?: string
): Response {
  const appError = toAppError(error)

  // Log the real thing exactly once, structured so Vercel's log search can
  // find it by context. `cause` carries the original driver/SDK error.
  const logLevel = appError.status >= 500 ? "error" : "warn"
  console[logLevel](
    JSON.stringify({
      event: "api_error",
      context,
      code: appError.code,
      status: appError.status,
      message: appError.message,
      cause:
        appError.cause instanceof Error
          ? { name: appError.cause.name, message: appError.cause.message }
          : undefined,
      stack: appError.status >= 500 ? appError.stack : undefined,
    })
  )

  const body: ApiFailure = {
    success: false,
    code: appError.code,
    // A 5xx never echoes its message — that message came from an internal
    // failure and may describe internals. 4xx messages are ones we authored.
    message:
      appError.status >= 500
        ? (publicMessage ?? "Something went wrong on our end. Please try again.")
        : appError.message,
  }
  if (appError.fieldErrors) body.fieldErrors = appError.fieldErrors

  if (res.headersSent) return res
  return res.status(appError.status).json(body)
}

/** Normalises the shapes this codebase actually throws into one AppError. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error

  if (isDuplicateKeyError(error)) {
    return new AppError("CONFLICT", "That already exists.", { cause: error })
  }

  if (isZodError(error)) {
    return AppError.validation(
      "Some of the details provided are not valid.",
      flattenZodError(error)
    )
  }

  return new AppError("INTERNAL", "Internal server error", { cause: error })
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

function isZodError(error: unknown): error is ZodError {
  return (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues?: unknown }).issues)
  )
}

function flattenZodError(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_"
    ;(fieldErrors[path] ??= []).push(issue.message)
  }
  return fieldErrors
}

/**
 * Parses untrusted input at the server boundary, throwing an AppError that
 * already carries per-field messages.
 *
 * Every controller that reads `req.body`, `req.query` or `req.params` should
 * go through this rather than reading the raw object — that is what makes
 * "never trust client-side validation" enforceable rather than aspirational.
 * It also strips unknown keys, so a caller cannot smuggle extra fields into
 * something that later gets spread into a database update.
 */
export function parseOrThrow<TSchema extends ZodType>(
  schema: TSchema,
  input: unknown,
  message = "Some of the details provided are not valid."
): ReturnType<TSchema["parse"]> {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw AppError.validation(message, flattenZodError(result.error))
  }
  return result.data as ReturnType<TSchema["parse"]>
}
