"use client"

import React, { useEffect, useId, useRef } from "react"
import { cn } from "../../lib/cn"

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  role?: "dialog" | "alertdialog"
  className?: string
  children?: React.ReactNode
}

/**
 * The focus-trap/scroll-lock/Escape/focus-restore pattern already proven
 * correct in MobileNav.jsx and DeleteAccount.jsx, extracted so every other
 * modal in the app (ConfirmationModal, SubSectionModal, CourseReviewModal)
 * can have the same behavior instead of each being built — or in
 * ConfirmationModal's case, not built at all — from scratch. See the
 * accessibility sweep task for which call sites still need migrating.
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {string} title - visible heading; also wired to aria-labelledby
 * @param {'dialog'|'alertdialog'} [role] - alertdialog for destructive confirmations
 */
export default function Modal({ open, onClose, title, role = "dialog", className, children }: ModalProps): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"

    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    firstFocusable?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
        return
      }

      if (event.key !== "Tab") return

      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!nodes?.length) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = overflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center overflow-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "relative w-full max-w-md rounded-lg border border-richblack-400 bg-richblack-800 p-6",
          className
        )}
      >
        {title && (
          <h3 id={titleId} className="text-xl font-semibold text-richblack-5">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  )
}
