/**
 * Joins class name fragments, skipping falsy ones. Deliberately not
 * tailwind-merge: nothing here needs conflict resolution between
 * overlapping utility classes (the design-system components use mutually
 * exclusive variants, not stacked overrides), so pulling in a dependency
 * for that would be solving a problem this codebase doesn't have.
 */
export type ClassValue = string | false | null | undefined

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ")
}
