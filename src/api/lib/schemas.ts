import mongoose from "mongoose"
import { z } from "zod"

/**
 * Reusable validation primitives for the API trust boundary.
 *
 * The reason these exist rather than each controller hand-rolling its own:
 * `req.body`/`req.query`/`req.params` are `any`, and Express happily parses
 * `?x[$ne]=1` or `{"token":{"$gt":""}}` into an OBJECT. Passing that straight
 * into `Model.findOne({ token })` is a working NoSQL operator injection —
 * that is exactly how the password-reset endpoint could be made to match an
 * arbitrary user. `z.string()` rejects the object, which is the whole defence,
 * so the important thing is that every filter value is parsed through one of
 * these before it reaches a query.
 */

/** A 24-char hex Mongo id. Rejects objects, arrays and malformed strings. */
export const objectId = (message = "A valid id is required") =>
  z
    .string({ message })
    .refine((value) => mongoose.Types.ObjectId.isValid(value), { message })

/** Email, normalised to lowercase so `A@b.com` and `a@b.com` are one account. */
export const email = () =>
  z
    .string({ message: "A valid email address is required" })
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: "A valid email address is required" }))

/**
 * Bounded free text. The max matters: without it a caller can post a
 * multi-megabyte string that is then stored, re-read and rendered forever.
 */
export const text = (
  { min = 1, max = 5000, label = "This field" }: { min?: number; max?: number; label?: string } = {}
) =>
  z
    .string({ message: `${label} is required` })
    .trim()
    .min(min, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`)

/**
 * An https URL restricted to a host allowlist.
 *
 * Used for anything a *different* user will later click (lecture attachments,
 * live-session links). An unrestricted user-supplied URL stored on a course is
 * a phishing vector delivered with the platform's own credibility behind it.
 */
export const httpsUrl = (allowedHosts?: readonly string[]) =>
  z
    .string()
    .trim()
    .refine(
      (value) => {
        let parsed: URL
        try {
          parsed = new URL(value)
        } catch {
          return false
        }
        if (parsed.protocol !== "https:") return false
        if (!allowedHosts?.length) return true
        return allowedHosts.some(
          (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
        )
      },
      {
        message: allowedHosts?.length
          ? `Must be an https link on one of: ${allowedHosts.join(", ")}`
          : "Must be a valid https link",
      }
    )

/** Money in rupees. Bounded on both ends so a negative or absurd price can't be stored. */
export const rupees = (max = 1_000_000) =>
  z.coerce
    .number({ message: "A valid amount is required" })
    .finite()
    .min(0, "Amount cannot be negative")
    .max(max, `Amount must be at most ${max}`)

/** Offset pagination for query strings. Clamped so no caller can request the whole collection. */
export const paginationQuery = ({ defaultLimit = 25, maxLimit = 100 } = {}) =>
  z.object({
    page: z.coerce.number().int().min(1).catch(1),
    limit: z.coerce.number().int().min(1).max(maxLimit).catch(defaultLimit),
  })

/** `{ page, limit, skip }` from a validated pagination query. */
export function toSkip({ page, limit }: { page: number; limit: number }) {
  return { page, limit, skip: (page - 1) * limit }
}
