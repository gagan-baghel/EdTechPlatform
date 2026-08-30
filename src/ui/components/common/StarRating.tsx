"use client"

import { useState } from "react"
import { FaStar } from "react-icons/fa"

export interface StarRatingProps {
  count?: number
  /** Current rating. Ignored while dragging/hovering in interactive mode. */
  value?: number
  /** Pixel size of each star. */
  size?: number
  activeColor?: string
  /** Present → interactive input; absent → read-only display. */
  onChange?: (value: number) => void
}

/**
 * Replaces react-rating-stars-component, abandoned since 2022. Its `ReactStars`
 * is a genuine function component that sets `defaultProps` — under React 19,
 * defaultProps on function components is removed entirely and silently
 * ignored, so every default (count, size, color) would have become
 * `undefined` instead of failing loudly. A ~40-line native component covers
 * the two modes this app actually uses (star-picker input, read-only display)
 * without carrying a dependency that can't be fixed upstream.
 */
export default function StarRating({
  count = 5,
  value = 0,
  size = 20,
  activeColor = "#ffd700",
  onChange,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const interactive = Boolean(onChange)
  const displayValue = interactive ? (hovered ?? value) : value

  return (
    <div
      className="flex items-center gap-0.5"
      {...(interactive
        ? { role: "radiogroup", "aria-label": "Rating" }
        : { role: "img", "aria-label": `${value.toFixed(1)} out of ${count} stars` })}
    >
      {Array.from({ length: count }, (_, i) => i + 1).map((star) => {
        const filled = star <= Math.round(displayValue)
        const icon = (
          <FaStar style={{ color: filled ? activeColor : "#4b5563", fontSize: size }} />
        )

        if (!interactive) {
          return (
            <span key={star} aria-hidden="true">
              {icon}
            </span>
          )
        }

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === Math.round(value)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer border-0 bg-transparent p-0.5 leading-none"
          >
            {icon}
          </button>
        )
      })}
    </div>
  )
}
