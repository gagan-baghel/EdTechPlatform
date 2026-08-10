import type { AccountType } from "./domain"

/**
 * The exact claim set `Auth.login` signs. Typing this is what lets the auth
 * middleware hand every downstream controller a `req.user` it can trust the
 * shape of, instead of each one re-deriving `any`.
 */
export interface JwtClaims {
  email: string
  id: string
  accountType: AccountType
  /**
   * Session id backing revocation. Optional because tokens minted before
   * session revocation shipped have no `jti` — see the auth middleware,
   * which lets those through once more rather than mass-logging-out
   * everyone already signed in.
   */
  jti?: string
  /** Added by `jwt.sign`/`jwt.verify`. */
  iat?: number
  exp?: number
}

/** Roles allowed through a given guard. */
export type RoleGuard = readonly AccountType[]

export const ROLE_GUARDS = {
  STUDENT: ["Student"],
  INSTRUCTOR: ["Instructor"],
  ADMIN: ["Admin"],
  INSTRUCTOR_OR_ADMIN: ["Instructor", "Admin"],
} as const satisfies Record<string, RoleGuard>
