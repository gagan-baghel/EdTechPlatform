"use client"

import React from "react"

import { CountUp } from "../../common/DashKit"

/**
 * The landing hero's product illustration: a drawing of the real student
 * scorecard with example figures, labelled as an example, animated with the
 * same motion system as the app itself (globals.css: draw-line, grow-y,
 * stagger).
 * Deterministic data: no Math.random, so server and client render the same.
 */

const SCORES = [42, 55, 51, 64, 60, 72, 78, 74, 86]
const WEEKS = [2, 3, 1, 4, 5, 3, 6, 5, 7, 6, 8, 9]

function polyline(values: number[], width: number, height: number, pad = 8) {
  const max = 100
  const step = (width - pad * 2) / (values.length - 1)
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${(pad + i * step).toFixed(1)} ${(height - pad - (v / max) * (height - pad * 2)).toFixed(1)}`)
    .join(" ")
}

export function HeroGraphic() {
  const width = 460
  const height = 150
  const path = polyline(SCORES, width, height)
  const last = SCORES.at(-1)!
  const lastX = width - 8
  const lastY = height - 8 - (last / 100) * (height - 16)

  return (
    <figure aria-label="Example of a student scorecard" className="border border-richblack-600 bg-richblack-900">
      <div className="flex items-center justify-between border-b border-richblack-600 px-5 py-3">
        <p className="stamp text-richblack-300">Scorecard · Modern JavaScript</p>
        <p className="stamp flex items-center gap-2 text-richblack-400">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          Example
        </p>
      </div>

      <div className="stagger grid grid-cols-3 gap-px border-b border-richblack-600 bg-richblack-700">
        <div className="flex items-center gap-3 bg-richblack-900 px-5 py-4">
          <span className="figure grid h-11 w-11 place-items-center border-2 border-richblack-5 text-2xl text-richblack-5">B</span>
          <span className="stamp text-richblack-400">Grade</span>
        </div>
        <div className="bg-richblack-900 px-5 py-4">
          <p className="stamp text-richblack-400">Score</p>
          <p className="figure mt-1 text-2xl text-richblack-5">
            <CountUp value={77} />
          </p>
        </div>
        <div className="bg-richblack-900 px-5 py-4">
          <p className="stamp text-richblack-400">Class position</p>
          <p className="figure mt-1 text-2xl text-richblack-5">
            #<CountUp value={3} />
            <span className="text-sm text-richblack-400"> of 42</span>
          </p>
        </div>
      </div>

      <div className="border-b border-richblack-600 px-5 pb-3 pt-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-richblack-5">Quiz scores</p>
          <p className="stamp text-richblack-400">Every attempt</p>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full" aria-hidden>
          {[25, 50, 75].map((g) => (
            <line
              key={g}
              x1="0"
              x2={width}
              y1={height - 8 - (g / 100) * (height - 16)}
              y2={height - 8 - (g / 100) * (height - 16)}
              className="stroke-richblack-700"
              strokeWidth="1"
            />
          ))}
          <line x1="0" x2={width} y1={height - 8} y2={height - 8} className="stroke-richblack-500" strokeWidth="1" />
          <path
            d={path}
            fill="none"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="draw-line stroke-accent"
            style={{ "--len": 900 } as React.CSSProperties}
          />
          <rect x={lastX - 4} y={lastY - 4} width="8" height="8" className="fade-in fill-accent" style={{ animationDelay: "1.8s" }} />
        </svg>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-6 px-5 py-4">
        <div>
          <p className="stamp mb-3 text-richblack-400">Lectures per week</p>
          <div className="flex h-16 items-end gap-1.5">
            {WEEKS.map((w, i) => (
              <span
                key={i}
                className="grow-y block flex-1 bg-richblack-5"
                style={{ height: `${(w / 9) * 100}%`, "--n": i } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
        <ol className="stagger w-40 divide-y divide-richblack-700 border-y border-richblack-700 text-xs">
          {[
            ["01", "Meera I.", 91],
            ["02", "Rohan D.", 84],
            ["03", "You", 77],
          ].map(([pos, name, score]) => (
            <li key={pos} className={`grid grid-cols-[1.75rem_1fr_auto] py-1.5 ${name === "You" ? "font-semibold text-richblack-5" : "text-richblack-200"}`}>
              <span className="figure text-richblack-400">{pos}</span>
              <span>{name}</span>
              <span className="figure">{score}</span>
            </li>
          ))}
        </ol>
      </div>
    </figure>
  )
}
