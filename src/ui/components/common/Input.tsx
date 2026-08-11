import React, { forwardRef } from "react"
import { cn } from "../../lib/cn"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

/**
 * Wraps the existing .form-style utility class (defined once in
 * globals.css, used across every form in the app) rather than replacing
 * it — that class is already the one consistent thing across forms. What
 * this adds: a real focus-visible ring. .form-style sets
 * focus:outline-none with no replacement, which removes the focus
 * indicator from every input using it; forwardRef so react-hook-form's
 * register() still works when spread onto this component.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, error, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "form-style w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50",
        error && "ring-2 ring-pink-500",
        className
      )}
      aria-invalid={error ? "true" : undefined}
      {...rest}
    />
  )
})

export default Input
