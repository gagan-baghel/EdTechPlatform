/**
 * The wire contract between src/api and src/ui.
 *
 * Every controller in this codebase already answers with
 * `{ success: boolean, ... }` — this types that existing shape rather than
 * inventing a new one, so no endpoint or caller has to change to adopt it.
 */

/** Successful response. `data` is absent on endpoints that only acknowledge. */
export interface ApiSuccess<TData = undefined> {
  success: true
  message?: string
  data: TData
}

/**
 * Failure response. `message` is the user-safe string — never a stack trace,
 * driver error, or internal path. See `src/api/lib/respond.ts`, which is the
 * only place allowed to build one of these from a caught error.
 */
export interface ApiFailure {
  success: false
  message: string
  /** Stable machine-readable discriminator; lets callers branch without string-matching `message`. */
  code?: ApiErrorCode
  /** Field-level validation problems, keyed by dotted field path. */
  fieldErrors?: Record<string, string[]>
}

export type ApiResponse<TData = undefined> = ApiSuccess<TData> | ApiFailure

/**
 * Discriminated union means `if (res.success)` narrows to ApiSuccess in the
 * true branch and ApiFailure in the false branch, so callers can't read
 * `.data` off a failure or `.message` off a success without TS objecting.
 */
export function isApiSuccess<TData>(
  res: ApiResponse<TData>
): res is ApiSuccess<TData> {
  return res.success
}

export const API_ERROR_CODES = [
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "PAYMENT_FAILED",
  "UPSTREAM_UNAVAILABLE",
  "INTERNAL",
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

/** HTTP status each code maps to. Single source of truth for `respond.ts`. */
export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PAYMENT_FAILED: 402,
  UPSTREAM_UNAVAILABLE: 503,
  INTERNAL: 500,
}

/** Cursor-free offset pagination, matching what the existing list endpoints do. */
export interface Paginated<TItem> {
  items: TItem[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export interface PaginationQuery {
  page: number
  pageSize: number
}
