import type { NextFunction, Request, RequestHandler, Response } from "express"

import type { JwtClaims } from "@/types/auth"
import { AppError } from "./AppError"
import { fail } from "./respond"

/** A request that has passed the `auth` middleware, so `user` is guaranteed. */
export interface AuthedRequest extends Request {
  user: JwtClaims
}

export type AuthedHandler = (
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) => unknown | Promise<unknown>

/**
 * Wraps a handler so a rejected promise becomes a proper JSON error response
 * instead of an unhandled rejection.
 *
 * Express 4 does not await handlers: an async handler that throws produces an
 * unhandled rejection and the client hangs until timeout. Every route in this
 * app is async, so every route needs this. (Express 5 fixes it natively —
 * when that upgrade lands this can be deleted, which is why it's one small
 * function rather than a framework.)
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => unknown,
  context: string
): RequestHandler {
  return (req, res, next) => {
    void (async () => {
      try {
        await handler(req, res, next)
      } catch (error) {
        fail(res, error, context)
      }
    })()
  }
}

/**
 * Same, for handlers that require authentication. Re-checks `req.user` rather
 * than trusting the route to have mounted `auth` first — a route registered
 * without its middleware would otherwise read `undefined.id` and 500 instead
 * of returning a clean 401.
 */
export function authedHandler(
  handler: AuthedHandler,
  context: string
): RequestHandler {
  return (req, res, next) => {
    void (async () => {
      try {
        if (!req.user) throw AppError.unauthenticated()
        await handler(req as AuthedRequest, res, next)
      } catch (error) {
        fail(res, error, context)
      }
    })()
  }
}

/** First client IP from the proxy chain; used by rate limiting and session records. */
export function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"]
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]!.trim()
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]!.split(",")[0]!.trim()
  }
  return req.socket?.remoteAddress ?? "unknown"
}
