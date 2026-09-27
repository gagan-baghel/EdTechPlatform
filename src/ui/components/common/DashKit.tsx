"use client"

import React, { useEffect, useState } from "react"

import { cn } from "../../lib/cn"

/**
 * Layout primitives for the dashboard design system ("Ledger", see
 * globals.css): pages are ruled sheets, not stacks of floating cards.
 *
 *  - PageHeader: the page title, a mono meta line, actions; ruled below.
 *  - Section:    a titled block of the page.
 *  - Ruled:      a grid whose 1px gaps ARE the dividing lines. Every child
 *                must be a cell (`bg-richblack-900`), and a row must be full —
 *                an empty slot shows as a solid rule-coloured block.
 *  - Metric:     one figure in a Ruled strip; it counts up to its value.
 */

function reducedMotion(): boolean {
  if (typeof window === "undefined") return true
  return (
    document.documentElement.classList.contains("a11y-reduced-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

const NUMBER = /\d[\d,]*(\.\d+)?/

/**
 * Counts the first number in a label ("₹51,973", "71%", 12) up from zero,
 * keeping whatever surrounds it. Remounted per value (see CountUp), so a new
 * figure — a different date range — counts again. Anything that isn't a plain
 * number renders as is.
 */
function CountUpText({ text }: { text: string }) {
  const match = NUMBER.exec(text)
  const target = match ? Number(match[0].replace(/,/g, "")) : 0
  const decimals = match?.[1] ? match[1].length - 1 : 0
  const counts = Boolean(match) && target > 0
  // Deterministic first render — the same on the server and in the browser,
  // which can't know the motion preference until it runs — then the first
  // animation frame either counts up or, for reduced motion, lands at once.
  const [progress, setProgress] = useState(counts ? 0 : 1)

  useEffect(() => {
    if (!counts) return
    const start = performance.now()
    const instant = reducedMotion()
    let frame = 0
    const tick = (now: number) => {
      const t = instant ? 1 : Math.min(1, (now - start) / 900)
      setProgress(1 - Math.pow(1 - t, 3))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [counts])

  if (!match || progress >= 1) return <>{text}</>
  const current = (target * progress).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: match[0].includes(","),
  })
  return <>{text.slice(0, match.index) + current + text.slice(match.index + match[0].length)}</>
}

export function CountUp({ value }: { value: React.ReactNode }) {
  if (typeof value !== "string" && typeof value !== "number") return <>{value}</>
  const text = String(value)
  return <CountUpText key={text} text={text} />
}

export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-richblack-600 pb-5">
      <div className="min-w-0">
        <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-richblack-5 md:text-[2.75rem]">
          {title}
        </h1>
        {meta && <p className="stamp mt-3 text-richblack-300">{meta}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
    </header>
  )
}

export function Section({
  title,
  aside,
  className,
  children,
}: {
  title: React.ReactNode
  /** Right side of the title row: a count, a link, a filter. */
  aside?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("mt-14 first:mt-0", className)}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-richblack-5">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function Ruled({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("stagger grid gap-px border border-richblack-700 bg-richblack-700", className)}>{children}</div>
}

export function Metric({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0 bg-richblack-900 px-4 py-4 md:px-5 md:py-5", className)}>
      <p className="stamp truncate text-richblack-300">{label}</p>
      <p className="figure mt-3 truncate text-[1.75rem] leading-none text-richblack-5 md:text-[2.125rem]">
        <CountUp value={value} />
      </p>
      {hint && <p className="mt-2 truncate text-xs text-richblack-300">{hint}</p>}
    </div>
  )
}

export function ProgressBar({
  value,
  label,
  className,
}: {
  /** 0–100 */
  value: number
  label: string
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn("h-1.5 w-full bg-richblack-700", className)}
    >
      <div className="grow-x h-full bg-accent" style={{ width: `${clamped}%` }} />
    </div>
  )
}

/** The 7 / 30 / 90-day range above a dashboard. */
export function RangePicker({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <div role="group" aria-label="Date range" className="inline-flex border border-richblack-600">
      {[7, 30, 90].map((days) => (
        <button
          key={days}
          type="button"
          aria-pressed={value === days}
          onClick={() => onChange(days)}
          className={cn(
            "stamp px-3 py-1.5 transition-colors",
            value === days ? "bg-richblack-5 text-richblack-900" : "text-richblack-300 hover:text-richblack-5"
          )}
        >
          {days}D
        </button>
      ))}
    </div>
  )
}

/** A table head cell in the dashboard's stamp style. */
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("stamp whitespace-nowrap py-2 pr-4 text-left font-normal text-richblack-300", className)}>
      {children}
    </th>
  )
}

/** Empty state: what's missing and the one thing to do about it. */
export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-richblack-600 px-6 py-12">
      <p className="text-base font-semibold text-richblack-5">{title}</p>
      {children && <div className="mt-2 text-sm text-richblack-300">{children}</div>}
    </div>
  )
}
