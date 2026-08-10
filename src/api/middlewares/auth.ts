import type { NextFunction, Request, RequestHandler, Response } from "express"
import jwt from "jsonwebtoken"

import type { AccountType } from "@/types/domain"
import type { JwtClaims } from "@/types/auth"
import { getEnv } from "../config/env"
import { AppError } from "../lib/AppError"
import { fail } from "../lib/respond"
import Session from "../models/Session"

/**
 * Reads the bearer token, or the httpOnly cookie set at login.
 *
 * `req.body.token` was previously also accepted. It has been dropped: no
 * caller in this repo ever sent it (every service module sends an
 * `Authorization: Bearer` header), and accepting credentials from a form
 * body widens the CSRF surface for nothing — a cross-site form POST can set
 * a body field, it cannot set an Authorization header.
 */
function extractToken(req: Request): string | null {
  const authHeader = req.header("Authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const bearer = authHeader.slice("Bearer ".length).trim()
    if (bearer) return bearer
  }

  const cookieToken = (req.cookies as Record<string, unknown> | undefined)?.token
  return typeof cookieToken === "string" && cookieToken ? cookieToken : null
}

/** Verifies the JWT is well-formed and carries the claims we actually signed. */
function parseClaims(token: string): JwtClaims {
  let decoded: unknown
  try {
    decoded = jwt.verify(token, getEnv().JWT_SECRET)
  } catch {
    // Never surface the jsonwebtoken reason (expired vs malformed vs bad
    // signature) — it tells an attacker which part of a forged token to fix.
    throw AppError.unauthenticated("Your session is not valid. Please log in again.")
  }

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof (decoded as JwtClaims).id !== "string" ||
    typeof (decoded as JwtClaims).accountType !== "string"
  ) {
    throw AppError.unauthenticated("Your session is not valid. Please log in again.")
  }

  return decoded as JwtClaims
}

export const auth: RequestHandler = (req, res, next) => {
  void (async () => {
    try {
      const token = extractToken(req)
      if (!token) {
        throw AppError.unauthenticated("You must be signed in to do that.")
      }

      const claims = parseClaims(token)

      // jti backs real session revocation (log out everywhere, revoke one
      // device) — a JWT alone stays valid for its full 24h no matter what.
      // Tokens issued before this shipped have no jti; those are let
      // through once more rather than instantly logging out everyone
      // already signed in, and age out naturally within 24h.
      if (claims.jti) {
        const session = await Session.findOneAndUpdate(
          { jti: claims.jti, revoked: false },
          { $set: { lastSeenAt: new Date() } }
        )
        if (!session) {
          throw AppError.unauthenticated(
            "Session has been revoked. Please log in again."
          )
        }
      }

      req.user = claims
      next()
    } catch (error) {
      fail(res, error, "auth")
    }
  })()
}

/**
 * One role guard instead of three near-identical copies.
 *
 * The originals each wrapped a single comparison in try/catch and answered
 * 401 for a role mismatch; that is a 403 — the caller IS authenticated, they
 * are just not allowed. Nothing in this repo currently branches on that
 * status (callers check `response.data.success`), so the correction is safe
 * today; it matters the moment anything does, because 401 conventionally
 * means "re-authenticate" and would send a correctly-logged-in user to a
 * login screen that cannot fix their problem.
 */
export function requireRole(...allowed: readonly AccountType[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return fail(res, AppError.unauthenticated(), "requireRole")
    }
    if (!allowed.includes(req.user.accountType)) {
      return fail(
        res,
        AppError.forbidden("You do not have access to this resource."),
        "requireRole"
      )
    }
    next()
  }
}

export const isStudent = requireRole("Student")
export const isInstructor = requireRole("Instructor")
export const isAdmin = requireRole("Admin")
