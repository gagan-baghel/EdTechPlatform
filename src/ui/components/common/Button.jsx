import { cn } from "../../lib/cn"

/**
 * Consolidates what the codebase had as eleven separate ad-hoc button
 * treatments (yellowButton/blackButton CSS classes, a hand-duplicated
 * "grey cancel" copied across four files, an "auth pill" duplicated
 * across two, a "yellow CTA" duplicated across six, plus assorted
 * one-off icon buttons and pill tabs) into one component with named
 * variants. Every variant gets the same focus-visible ring and disabled
 * state — several of the originals had neither consistently.
 *
 * This is additive, not a rewrite of every call site: existing IconBtn
 * usages keep working (IconBtn now delegates here), and the highest-
 * duplication patterns (yellow CTA, grey cancel, auth pill) have been
 * migrated to prove the system out. The rest of the one-off buttons are
 * candidates to migrate opportunistically, not a backlog that needed
 * clearing in one pass.
 */
const VARIANTS = {
  primary: "bg-yellow-50 text-ink hover:brightness-95",
  secondary: "bg-richblack-800 text-richblack-5 hover:brightness-110",
  // The generic bordered button (error pages, Search pagination, etc —
  // the audit's "outline secondary" pattern).
  outline: "border border-richblack-600 bg-transparent text-richblack-5 hover:bg-richblack-800",
  // IconBtn's own legacy outline={true} look (yellow border) — distinct
  // from the variant above. Nothing in the codebase currently sets
  // outline=true on IconBtn, but this is the contract a caller that did
  // would be relying on, so it's kept exact rather than folded into
  // "outline" above and silently changed.
  iconBtnOutline: "border border-yellow-50 bg-transparent text-ink hover:bg-richblack-900/5",
  ghost: "bg-richblack-300 text-ink hover:bg-richblack-200",
  danger: "bg-pink-700 text-paper hover:bg-pink-600",
  pill: "rounded-full bg-transparent text-richblack-300 hover:text-richblack-100",
}

const SIZES = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-2 text-base",
  lg: "px-6 py-3 text-base",
}

export default function Button({
  variant = "primary",
  size = "md",
  pill = false,
  outline = false,
  disabled = false,
  className,
  children,
  type = "button",
  ...rest
}) {
  // outline is IconBtn's original prop name — kept so IconBtn's wrapper
  // doesn't need every call site updated to say variant="iconBtnOutline" instead.
  const resolvedVariant = outline ? "iconBtnOutline" : variant

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-x-2 font-semibold transition",
        pill ? "rounded-full" : "rounded-md",
        VARIANTS[resolvedVariant],
        SIZES[size],
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50 focus-visible:ring-offset-2 focus-visible:ring-offset-richblack-900",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
