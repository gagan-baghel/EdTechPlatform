import { API_ERROR_STATUS, type ApiErrorCode } from "@/types/api"

/**
 * A failure that is safe to describe to the caller.
 *
 * The distinction that matters: an AppError carries a message the user is
 * *meant* to read, so `respond.ts` passes it through verbatim. Anything else
 * that reaches the error handler — a driver error, a TypeError, a Razorpay
 * SDK rejection — is logged in full and reported as a generic message, so
 * internal paths, query shapes and stack traces never reach a response body.
 */
export class AppError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly fieldErrors?: Record<string, string[]>
  /** The underlying failure, for logs only. Never serialised to a response. */
  override readonly cause?: unknown

  constructor(
    code: ApiErrorCode,
    message: string,
    options: {
      status?: number
      fieldErrors?: Record<string, string[]>
      cause?: unknown
    } = {}
  ) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.status = options.status ?? API_ERROR_STATUS[code]
    this.fieldErrors = options.fieldErrors
    this.cause = options.cause
    Error.captureStackTrace?.(this, AppError)
  }

  static unauthenticated(message = "You must be signed in to do that.") {
    return new AppError("UNAUTHENTICATED", message)
  }

  static forbidden(message = "You do not have access to that.") {
    return new AppError("FORBIDDEN", message)
  }

  /**
   * Deliberately the same message for "does not exist" and "exists but isn't
   * yours" — distinguishing them tells an attacker which ids are real.
   */
  static notFound(message = "Not found.") {
    return new AppError("NOT_FOUND", message)
  }

  static validation(message: string, fieldErrors?: Record<string, string[]>) {
    return new AppError("VALIDATION_FAILED", message, { fieldErrors })
  }

  static conflict(message: string) {
    return new AppError("CONFLICT", message)
  }

  static upstream(message: string, cause?: unknown) {
    return new AppError("UPSTREAM_UNAVAILABLE", message, { cause })
  }
}


export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Safe `error.message` for a caught `unknown`.
 *
 * Under `useUnknownInCatchVariables` every `catch (error)` is `unknown`, and
 * the codebase logs `error.message` in ~40 places. This is that one line,
 * instead of forty casts back to `any`.
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "Unknown error"
}

/** Mongo duplicate-key errors carry `code: 11000`; several controllers branch on it. */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  )
}
