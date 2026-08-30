"use client"

import { useEffect, useRef, useState } from "react"

type Direction = "up" | "down" | "left" | "right" | "none"

export interface RevealProps {
  children: React.ReactNode
  /** Which way the element travels in from. */
  from?: Direction
  /** Milliseconds to wait after the element enters view. Use for stagger. */
  delay?: number
  className?: string
  /** Render as something other than a div — e.g. "li" inside a list. */
  as?: "div" | "section" | "li" | "article"
}

/**
 * Fades and lifts its children in the first time they scroll into view.
 *
 * IntersectionObserver rather than a scroll listener: a listener fires on every
 * frame of every scroll for every element, which is the classic way a long
 * marketing page turns janky. The observer does that work off the main thread
 * and calls back once per element.
 *
 * `unobserve` on first intersection is deliberate — re-animating on every pass
 * makes a page feel restless, and content you have already read should not hide
 * itself again when you scroll back.
 *
 * The hidden and shown states are CSS classes, not inline styles, for two
 * reasons: `prefers-reduced-motion` and the in-app accessibility toggle can
 * then neutralise the whole effect in `globals.css` without this component
 * knowing about either, and nothing has to call setState during an effect to
 * handle them.
 */
export default function Reveal({
  children,
  from = "up",
  delay = 0,
  className = "",
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          setShown(true)
          observer.unobserve(entry.target)
        }
      },
      // The negative bottom margin holds the reveal until the element is
      // properly on screen; at rootMargin 0 it finishes before you see it.
      { threshold: 0.05, rootMargin: "0px 0px -10% 0px" }
    )

    observer.observe(node)

    /**
     * Failsafe: show the content regardless after a short delay.
     *
     * An observer with a zero-height root never fires, and a viewport can
     * legitimately measure zero — a hidden iframe, a backgrounded tab being
     * restored, some embedded webviews. Without this, the content those users
     * see is a blank page, permanently. The reveal is decorative; the content
     * is not, so anything unexpected resolves in favour of showing it.
     */
    const failsafe = window.setTimeout(() => setShown(true), 2500)

    return () => {
      observer.disconnect()
      window.clearTimeout(failsafe)
    }
  }, [])

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLLIElement>}
      className={`reveal reveal--${from}${shown ? " is-visible" : ""} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
