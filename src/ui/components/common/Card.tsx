import React from "react"
import { cn } from "../../lib/cn"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  /**
   * Kept for compatibility with existing callers. Only `p-0` changes anything:
   * a ruled block has no side padding, so it lines up with the page's text.
   */
  padding?: string
  children?: React.ReactNode
}

/**
 * A block of a dashboard page. In the "Ledger" system (globals.css) blocks
 * are not boxes floating on a background — each is separated from the one
 * above by a single rule, and its content sits on the page itself.
 */
export default function Card({ className, padding = "p-6", children, ...rest }: CardProps): React.JSX.Element {
  return (
    <div className={cn("border-t border-richblack-600", padding === "p-0" ? "" : "py-6", className)} {...rest}>
      {children}
    </div>
  )
}
