import React from "react"
import { cn } from "../../lib/cn"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  padding?: string
  children?: React.ReactNode
}

/**
 * The bordered/rounded container pattern repeated ad hoc across course
 * cards, admin panels, and settings sections
 * (border-richblack-700 bg-richblack-800 rounded-md, with minor variations
 * each time). One shared shape; padding stays a prop since consumers
 * genuinely differ there.
 */
export default function Card({ className, padding = "p-6", children, ...rest }: CardProps): React.JSX.Element {
  return (
    <div
      className={cn("rounded-md border border-richblack-700 bg-richblack-800", padding, className)}
      {...rest}
    >
      {children}
    </div>
  )
}
