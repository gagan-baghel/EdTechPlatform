/**
 * The canonical public origin of this deployment.
 *
 * This lived in three places — `ui/utils/siteUrl.ts`, `api/mail/templates/
 * shared.ts` and `api/controllers/ResetPassword.ts` — each with slightly
 * different fallback and error behaviour, which is how a password-reset link
 * and the logo in the same email could end up pointing at different origins.
 * It sits outside both `api/` and `ui/` because both layers legitimately need
 * it and neither should import the other.
 *
 * It is NEVER derived from the request Host header. Trusting `x-forwarded-host`
 * lets an attacker who triggers a password reset for someone else's address
 * choose the domain the victim's reset token is delivered to.
 *
 * Contains no secrets: the values it reads are public URLs, so it is safe in
 * a client bundle (only `NEXT_PUBLIC_SITE_URL` is actually inlined there;
 * the others resolve to `undefined` in the browser, which is why every caller
 * today is server-side).
 */
export function resolveSiteUrl(): string {
  const raw =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")

  if (!raw) {
    // `next build` runs with NODE_ENV=production, but a build is not a
    // deployment: the machine prerendering pages legitimately has no runtime
    // config. Warning there would train everyone to ignore this line.
    const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build"
    if (process.env.NODE_ENV === "production" && !isBuildPhase) {
      // Loud but non-fatal: an outage over a wrong link in an email is worse
      // than the wrong link. Callers that must not guess (password reset)
      // use `requireSiteUrl` instead.
      console.error(
        JSON.stringify({
          event: "config_error",
          message: "APP_BASE_URL is not configured; falling back to localhost",
        })
      )
    }
    return "http://localhost:3000"
  }

  // Hosting dashboards routinely take the value without a scheme
  // ("myapp.vercel.app"), and `new URL()` throws on that.
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  try {
    return new URL(withProtocol).origin
  } catch {
    return "http://localhost:3000"
  }
}

/**
 * Same, but throws rather than guessing. Used where an incorrect origin is a
 * security problem and not merely a broken image — i.e. password reset.
 */
export function requireSiteUrl(): string {
  const configured =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")

  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build"
  if (!configured && process.env.NODE_ENV === "production" && !isBuildPhase) {
    throw new Error("APP_BASE_URL is not configured")
  }

  return resolveSiteUrl()
}
