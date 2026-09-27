import type { IconType } from "react-icons"
import { AiOutlinePlayCircle, AiOutlineRobot } from "react-icons/ai"
import { SiOpenai, SiRazorpay } from "react-icons/si"

import { BrandMark } from "../../common/Brand"

/**
 * The "what it runs on" orbit: the services the platform actually uses —
 * Razorpay for payments, OpenAI for lecture transcription, a CDN for video,
 * and a language model for the tutor and assistant. (It used to show Google
 * Workspace, Slack and Microsoft 365, none of which the product connects to.)
 *
 * The previous version placed each logo with a hardcoded pixel translate
 * (`translate(-120px, -90px)`, `translate(200px, -150px)`, …) that had no
 * relationship to the radii of the two dashed rings behind them. So nothing
 * actually sat on a circle — the logos were scattered, one of them outside
 * both rings entirely, and the whole thing read as a layout bug rather than a
 * diagram. The fixed 500px ring also overflowed its container below ~560px.
 *
 * Positions are now derived from the ring they belong to:
 *
 *   x = 50% + cos(angle) · radius
 *   y = 50% + sin(angle) · radius
 *
 * in percentages of a square container, so a logo is on its ring by
 * construction at every viewport size, and the diagram scales as one piece.
 *
 * Each ring is its own rotor so the two orbit at different speeds and
 * directions; the nodes counter-rotate at the same duration so the logos stay
 * upright rather than tumbling. All of it is CSS — see `orbit-*` in
 * globals.css, which also stops the motion under `prefers-reduced-motion`.
 */

interface Integration {
  name: string
  Icon: IconType
  /**
   * Brand colour. Deliberately literal — these are other companies' marks and
   * must not shift with our theme. Omitted for the one node that is ours,
   * which uses the theme-aware `.orbit-accent` class instead.
   */
  color?: string
  /** Degrees clockwise from 3 o'clock. */
  angle: number
}

/** Ring radius as a percentage of the container's half-width. */
const RINGS = {
  inner: { radius: 33, durationSeconds: 42, direction: "normal" },
  outer: { radius: 46, durationSeconds: 64, direction: "reverse" },
} as const

type RingName = keyof typeof RINGS

const INTEGRATIONS: Record<RingName, Integration[]> = {
  inner: [
    { name: "Payments by Razorpay", Icon: SiRazorpay, color: "#3395FF", angle: 200 },
    { name: "AI tutor and assistant", Icon: AiOutlineRobot, angle: 20 },
  ],
  outer: [
    { name: "Lecture transcripts by OpenAI Whisper", Icon: SiOpenai, angle: 315 },
    { name: "Video streamed from a global CDN", Icon: AiOutlinePlayCircle, angle: 135 },
  ],
}

function orbitPosition(angle: number, radius: number) {
  const radians = (angle * Math.PI) / 180
  return {
    left: `${50 + Math.cos(radians) * radius}%`,
    top: `${50 + Math.sin(radians) * radius}%`,
  }
}

function Ring({ name }: { name: RingName }) {
  const { radius, durationSeconds, direction } = RINGS[name]

  return (
    <div
      className="orbit-rotor absolute inset-0"
      style={{
        animationDuration: `${durationSeconds}s`,
        animationDirection: direction,
      }}
    >
      {/* The ring itself, sized from the same radius the nodes use — two
          independently-authored numbers are exactly how they drift apart. */}
      <div
        className={`absolute rounded-full border border-dashed ${
          name === "inner" ? "border-richblack-400" : "border-richblack-500"
        }`}
        style={{ inset: `${50 - radius}%` }}
        aria-hidden
      />

      {INTEGRATIONS[name].map(({ Icon, name: label, color, angle }) => (
        <div
          key={label}
          className="absolute h-[14%] w-[14%] -translate-x-1/2 -translate-y-1/2"
          style={orbitPosition(angle, radius)}
        >
          {/* Counter-rotation lives on an inner element so it composes with the
              parent's centring translate instead of fighting it. */}
          <div
            className="orbit-node group flex h-full w-full items-center justify-center rounded-[28%] border border-richblack-600 bg-richblack-700/95 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-[border-color,box-shadow] duration-300 hover:border-[#c3ebfa]/60 hover:shadow-[0_16px_40px_-10px_rgba(195,235,250,0.35)]"
            style={{
              animationDuration: `${durationSeconds}s`,
              animationDirection: direction === "normal" ? "reverse" : "normal",
            }}
            title={label}
          >
            <Icon
              className={`h-1/2 w-1/2 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-125${
                color ? "" : " orbit-accent"
              }`}
              style={color ? { color } : undefined}
              aria-hidden
            />
            <span className="sr-only">{label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function IntegrationOrbit() {
  return (
    // `aspect-square` plus a viewport-relative max-width is what makes this
    // fluid: every ring and offset below is a percentage of this box.
    <div className="relative mx-auto aspect-square w-full max-w-[min(88vw,34rem)]">
      {/* Glow behind the hub, so the centre reads as the source the rings
          orbit rather than as a fifth, larger logo. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-3/5 w-3/5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c3ebfa]/[0.14] blur-3xl"
      />

      {/* Two offset pulses reading outward from the hub. The stagger is what
          stops it looking like a single blinking ring. */}
      {[0, 2.25].map((delay) => (
        <div
          key={delay}
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[66%] w-[66%] -translate-x-1/2 -translate-y-1/2"
        >
          {/* The animation sets `transform`, so it lives on a child rather than
              on the element carrying the centring translate — otherwise the
              keyframes overwrite the centring and the ring pulses from the
              bottom-right corner. */}
          <div
            className="pulse-ring h-full w-full rounded-full border border-[#c3ebfa]/50"
            style={{ animationDelay: `${delay}s` }}
          />
        </div>
      ))}

      <Ring name="outer" />
      <Ring name="inner" />

      <div className="absolute left-1/2 top-1/2 z-20 h-[21%] w-[21%] -translate-x-1/2 -translate-y-1/2">
        {/* Same reason as the pulse rings: `float-slow` animates `transform`. */}
        <div className="float-slow flex h-full w-full items-center justify-center rounded-[30%] border border-[#c3ebfa]/40 bg-gradient-to-br from-[#c3ebfa] to-[#8ab4f8] shadow-[0_20px_60px_-12px_rgba(195,235,250,0.45)]">
          <BrandMark className="h-1/2 w-1/2 text-ink" />
          <span className="sr-only">IntelleCraft</span>
        </div>
      </div>
    </div>
  )
}
