/**
 * Small generic helpers used by the domain types. Kept deliberately few —
 * every one here has more than one real call site in this repo.
 */

/**
 * Marks reference fields as populated. Mongoose refs are an id until a
 * `.populate()` swaps them for the document, and that difference is exactly
 * the thing that gets mixed up at runtime, so it's worth expressing:
 *
 *   type CourseWithInstructor = Populated<Course, "instructor", User>
 */
export type Populated<T, K extends keyof T, TDoc> = Omit<T, K> & {
  [P in K]: T[P] extends readonly unknown[] ? TDoc[] : TDoc
}

/** The JSON shape of a value after it crosses the wire (Dates become strings). */
export type Serialized<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T

/** At least one key of T must be present. */
export type AtLeastOne<T, Keys extends keyof T = keyof T> = Partial<T> &
  { [K in Keys]-?: Required<Pick<T, K>> }[Keys]

/** Narrowing helper for the `x != null` check that appears throughout the UI. */
export function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}
