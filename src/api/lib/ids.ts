import type { Types } from "mongoose"

/** Anything this codebase uses as an id: an ObjectId, or its string form. */
export type IdInput = Types.ObjectId | string | { toString(): string } | null | undefined

/**
 * Compares two ids regardless of which side is an ObjectId and which is a
 * string. `ObjectId === string` is always false, so a raw `===` between a
 * populated document's id and a `req.params` value silently answers "no
 * match" — which, in an access check, means either locking out the rightful
 * owner or (when the comparison is inverted) letting the wrong one through.
 */
export function sameId(a: IdInput, b: IdInput): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false
  return String(a) === String(b)
}

/**
 * Membership test for an id array, used by every enrolment check.
 *
 * `.lean()` widens ref arrays to `any[]`, so the callback parameter in
 * `user.courses.some((id) => ...)` was implicitly `any` at each of the five
 * call sites that did this by hand. One typed helper instead.
 */
export function containsId(ids: readonly IdInput[] | undefined | null, target: IdInput): boolean {
  if (!ids?.length || target === null || target === undefined) return false
  const needle = String(target)
  return ids.some((id) => String(id) === needle)
}
