import { z } from "zod"

/**
 * The one place server configuration is read.
 *
 * Before this, `process.env.X` was read directly in ~20 files, each with its
 * own idea of whether X was optional — connectDB assumed a URL existed,
 * mailSender checked at send time, razorpay.js constructed a client from
 * `undefined` and failed opaquely on first charge. This validates once, at
 * first access, and fails with a message that names the missing variable.
 *
 * SERVER ONLY. Nothing here is `NEXT_PUBLIC_`, so none of it is inlined into
 * the client bundle; a client component that imported this would see every
 * value as undefined and throw on the spot, which is the failure mode we
 * want — loud, not silent. Client-side public config lives in
 * `src/ui/config/publicEnv.ts`.
 */

const nonEmpty = (name: string) =>
  z.string().min(1, `${name} is required but was empty`)

/**
 * `next build` runs with NODE_ENV=production, but a build is not a deployment:
 * it prerenders pages on a machine that legitimately has no runtime secrets.
 * Requiring them there fails the build (and did — it broke sitemap generation)
 * for variables nothing at build time actually uses.
 */
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build"
const isProduction = process.env.NODE_ENV === "production" && !isBuildPhase

/**
 * Required when actually serving production traffic, optional locally and at
 * build time so `npm run dev` and CI builds work unconfigured. Each of these
 * is additionally checked at its point of use — the webhook rejects deliveries
 * without its secret, cron endpoints refuse every request without theirs — so
 * this is a fail-fast convenience, not the only line of defence.
 */
const requiredInProduction = (name: string) =>
  isProduction ? nonEmpty(name) : z.string().default("")

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  /* --- Data ---------------------------------------------------------- */
  MONGODB_CONNECTION_URL: nonEmpty("MONGODB_CONNECTION_URL"),

  /* --- Auth ---------------------------------------------------------- */
  JWT_SECRET: nonEmpty("JWT_SECRET"),
  /** Enables POST /auth/bootstrap-admin. Route 404s when unset, by design. */
  ADMIN_SETUP_KEY: z.string().optional(),

  /* --- Mail ---------------------------------------------------------- */
  MAIL_HOST: z.string().default(""),
  MAIL_USER: z.string().default(""),
  MAIL_PASS: z.string().default(""),
  SUPPORT_EMAIL: z.string().default("support@intellecraft.com"),

  /* --- Media --------------------------------------------------------- */
  CLOUDINARY_CLOUD_NAME: z.string().default(""),
  CLOUDINARY_API_KEY: z.string().default(""),
  CLOUDINARY_API_SECRET: z.string().default(""),
  FOLDER_NAME: z.string().default("IntelleCraft"),

  /* --- Payments ------------------------------------------------------ */
  RAZORPAY_KEY: z.string().default(""),
  RAZORPAY_SECRET: z.string().default(""),
  /** Razorpay webhook signing secret. Webhook rejects every delivery without it. */
  WEBHOOK_SECRET: requiredInProduction("WEBHOOK_SECRET"),

  /* --- Platform ------------------------------------------------------ */
  /**
   * Password-reset links are built from this rather than the request Host
   * header, so an attacker can't point a victim's reset link at their own
   * domain. That is the entire reason it must not fall back to the request.
   */
  APP_BASE_URL: requiredInProduction("APP_BASE_URL"),
  /** Vercel Cron shared secret. Cron endpoints refuse every request without it. */
  CRON_SECRET: requiredInProduction("CRON_SECRET"),

  /* --- AI (all optional; endpoints degrade to "not configured") ------- */
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),
})

export type ServerEnv = z.infer<typeof envSchema>

let cached: ServerEnv | null = null

/**
 * Lazy so importing a module that *mentions* env doesn't force validation at
 * bundle-evaluation time — which would make a missing variable fail during
 * Next's build-time module graph walk rather than at the first request that
 * actually needs it.
 */
export function getEnv(): ServerEnv {
  if (cached) return cached

  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n")
    // Names the variables, never their values.
    throw new Error(`Invalid server environment configuration:\n${missing}`)
  }

  // A short signing secret is brute-forceable offline against any captured
  // token. Warned rather than thrown because throwing here would take a
  // running deployment down on its next cold start, turning a latent
  // weakness into an outage.
  if (parsed.data.JWT_SECRET.length < 32) {
    console.warn(
      JSON.stringify({
        event: "config_warning",
        message:
          "JWT_SECRET is shorter than 32 characters and should be rotated to a longer random value.",
      })
    )
  }

  cached = parsed.data
  return cached
}

/** True when the AI features have credentials; endpoints check this before calling out. */
export function hasAnthropicKey(): boolean {
  return Boolean(getEnv().ANTHROPIC_API_KEY)
}

export function hasOpenAiKey(): boolean {
  return Boolean(getEnv().OPENAI_API_KEY)
}
