import type { JwtClaims } from "./auth"

/**
 * `req.user` is set by the auth middleware and read by nearly every
 * controller. Declaring it here is what turns those reads from implicit
 * `any` into a checked `JwtClaims`.
 *
 * Optional on the base Request because unauthenticated routes share the same
 * type; handlers that require it take `AuthedRequest` (see lib/http.ts),
 * which narrows it to required.
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtClaims
      /** Raw body, populated only on the webhook route by `express.raw()`. */
      rawBody?: Buffer
    }
  }
}

export {}
