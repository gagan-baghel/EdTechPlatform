import React from "react"
import Button, { type ButtonProps } from "./Button"

export interface IconBtnProps extends Omit<ButtonProps, "className"> {
  text?: React.ReactNode
  customClasses?: string
}

// Thin compatibility wrapper — IconBtn's actual styling now lives in
// Button (the shared design-system primitive); this keeps all 14 existing
// IconBtn call sites working unchanged rather than requiring them to
// migrate to Button's prop names.
export default function IconBtn({
  text,
  onClick,
  children,
  disabled,
  outline = false,
  customClasses,
  // Defaults to "button" — without this an IconBtn inside a form submits it.
  type = "button",
  ...rest
}: IconBtnProps): React.JSX.Element {
  return (
    <Button
      disabled={disabled}
      onClick={onClick}
      outline={outline}
      className={customClasses}
      type={type}
      {...rest}
    >
      {children ? (
        <>
          <span className={outline ? "text-accent" : undefined}>{text}</span>
          {children}
        </>
      ) : (
        text
      )}
    </Button>
  )
}
