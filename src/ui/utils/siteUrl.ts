/**
 * Never let a misconfigured env var fail the build. Vercel users commonly
 * set this without a protocol ("myapp.vercel.app"), which makes `new
 * URL()` throw. VERCEL_URL is injected by the platform and also has no
 * protocol. Extracted from src/app/layout.jsx so generateMetadata
 * functions across the public routes can build correct absolute URLs
 * (canonical links, OG images, JSON-LD) without duplicating this logic.
 */
export function resolveSiteUrl(): string {
  const raw =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000"

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  try {
    return new URL(withProtocol).origin
  } catch {
    return "http://localhost:3000"
  }
}
