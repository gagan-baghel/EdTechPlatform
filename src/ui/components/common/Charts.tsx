"use client"

import React, { useMemo } from "react"
import {
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
  type TooltipItem,
} from "chart.js"
import { Bar, Line } from "react-chartjs-2"

import { useTheme } from "../../providers/ThemeProvider"
import { geistMono } from "../../fonts"
import { cn } from "../../lib/cn"

Chart.register(BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip)

/**
 * The dashboards' charts, drawn in the "Ledger" system: flat marks, square
 * bars, hairline grid, mono figures.
 *
 * Series colours lead with cobalt (the one accent), then amber, then green —
 * validated for colour-vision deficiency on every pair (not just neighbours)
 * against the actual dashboard grounds, #0f0f0e carbon and #f4f4f2 paper, and
 * stepped separately per theme. Assigned by position, never cycled; nothing
 * here needs a fourth. Every chart also has a table.
 */
const SERIES = {
  dark: ["#4d6bff", "#c98500", "#199e70"],
  light: ["#1f3fe0", "#a86400", "#0f8a5f"],
}

/**
 * Reserved for state, never for "series 3" — and always paired with an icon
 * and a word. "Needs you" is marked with the accent itself.
 */
export const STATUS_COLORS = {
  good: "#0ca30c",
  critical: "#d03b3b",
}

/** Reads a richblack-* token (stored as "r g b") as a colour canvas accepts. */
function token(name: string): string {
  if (typeof window === "undefined") return "rgb(149, 149, 143)"
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()
  return raw ? `rgb(${raw.split(/\s+/).join(", ")})` : "rgb(149, 149, 143)"
}

/** Settings > Accessibility sets this class on <html>; the OS setting counts too. */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true
  return (
    document.documentElement.classList.contains("a11y-reduced-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

export function useChartTheme() {
  const { theme } = useTheme()
  return useMemo(
    () => ({
      series: SERIES[theme],
      // Tokens are re-read when the theme flips — they are what flips.
      grid: token("richblack-700"),
      axis: token("richblack-300"),
      muted: token("richblack-500"),
      ink: token("richblack-5"),
      surface: token("richblack-900"),
      reducedMotion: prefersReducedMotion(),
    }),
    [theme]
  )
}

export interface Series {
  label: string
  data: number[]
  /** Overrides the positional colour — only for status series (e.g. failures). */
  color?: string
}

interface ChartProps {
  labels: string[]
  series: Series[]
  /** Formats values on the axis and in the tooltip. */
  format?: (value: number) => string
  height?: number
  stacked?: boolean
  horizontal?: boolean
  /** Short description for screen readers; the table view carries the numbers. */
  ariaLabel: string
}

const MONO = { family: geistMono.style.fontFamily, size: 11 }

function baseOptions(
  theme: ReturnType<typeof useChartTheme>,
  { series, format, stacked, horizontal }: Pick<ChartProps, "series" | "format" | "stacked" | "horizontal">
): ChartOptions<"bar"> {
  const valueAxis = {
    beginAtZero: true,
    stacked,
    grid: { color: theme.grid, lineWidth: 1, drawTicks: false },
    border: { display: false },
    ticks: {
      color: theme.axis,
      font: MONO,
      padding: 8,
      maxTicksLimit: 5,
      precision: 0,
      callback: (value: string | number) => (format ? format(Number(value)) : Number(value).toLocaleString()),
    },
  }
  const categoryAxis = {
    stacked,
    grid: { display: false },
    border: { color: theme.axis },
    ticks: { color: theme.axis, font: MONO, maxRotation: 0, autoSkipPadding: 20 },
  }
  return {
    responsive: true,
    maintainAspectRatio: false,
    // Bars rise from the baseline one after another; lines lift into place.
    animation: theme.reducedMotion
      ? false
      : {
          duration: 700,
          easing: "easeOutQuart",
          delay: (ctx: { type: string; mode: string; dataIndex: number }) =>
            ctx.type === "data" && ctx.mode === "default" ? ctx.dataIndex * 16 : 0,
        },
    indexAxis: horizontal ? "y" : "x",
    interaction: { mode: "index", intersect: false },
    plugins: {
      // One series: the panel title names it, so a legend only repeats it.
      legend: {
        display: series.length > 1,
        position: "top",
        align: "start",
        labels: { color: theme.axis, font: MONO, boxWidth: 10, boxHeight: 10, padding: 14 },
      },
      tooltip: {
        cornerRadius: 0,
        backgroundColor: theme.ink,
        titleColor: theme.surface,
        bodyColor: theme.surface,
        titleFont: { ...MONO, weight: "bold" },
        bodyFont: MONO,
        padding: 10,
        boxPadding: 4,
        callbacks: {
          label: (ctx: TooltipItem<"bar">) => {
            const raw = Number(horizontal ? ctx.parsed.x : ctx.parsed.y)
            return ` ${ctx.dataset.label}: ${format ? format(raw) : raw.toLocaleString()}`
          },
        },
      },
    },
    scales: horizontal ? { x: valueAxis, y: categoryAxis } : { x: categoryAxis, y: valueAxis },
  } as ChartOptions<"bar">
}

export function TrendChart({ labels, series, format, height = 240, ariaLabel }: ChartProps) {
  const theme = useChartTheme()
  const data = {
    labels,
    datasets: series.map((s, i) => {
      const color = s.color ?? theme.series[i]!
      return {
        label: s.label,
        data: s.data,
        borderColor: color,
        // The wash doubles as the legend key, so it is only a wash when there
        // is no legend; with several series it is solid (and fill is off).
        backgroundColor: series.length === 1 ? `${color}1a` : color,
        // A wash under a lone series; several washes would muddy each other.
        fill: series.length === 1 ? "origin" : false,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: theme.surface,
        pointBackgroundColor: color,
        pointStyle: "rect" as const,
        // Monotone, not a tension spline: a spline overshoots below 0 between spikes.
        cubicInterpolationMode: "monotone" as const,
      }
    }),
  }
  return (
    <div style={{ height }} className="relative">
      <Line
        data={data}
        options={baseOptions(theme, { series, format }) as unknown as ChartOptions<"line">}
        role="img"
        aria-label={ariaLabel}
      />
    </div>
  )
}

export function BarsChart({ labels, series, format, height = 240, stacked, horizontal, ariaLabel }: ChartProps) {
  const theme = useChartTheme()
  const data = {
    labels,
    datasets: series.map((s, i) => ({
      label: s.label,
      data: s.data,
      backgroundColor: s.color ?? theme.series[i]!,
      borderRadius: 0,
      // Stacked segments are parted by a line of the ground, not an outline.
      borderColor: theme.surface,
      borderWidth: stacked ? 1 : 0,
      maxBarThickness: 28,
      categoryPercentage: 0.8,
      barPercentage: 0.9,
    })),
  }
  return (
    <div style={{ height }} className="relative">
      <Bar
        data={data}
        options={baseOptions(theme, { series, format, stacked, horizontal })}
        role="img"
        aria-label={ariaLabel}
      />
    </div>
  )
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/**
 * Weekday x hour grid of one magnitude. Sequential: a single hue, the accent,
 * stepped by opacity from the ground up — so "more" is always "stronger", in
 * both themes. Five steps; the exact figure is in each cell's title and in
 * the table view beside it.
 */
export function Heatmap({ rows, unit, ariaLabel }: { rows: number[][]; unit: string; ariaLabel: string }) {
  const max = Math.max(1, ...rows.flat())
  const step = (v: number) => (v <= 0 ? 0 : Math.min(5, Math.ceil((v / max) * 5)))
  const alpha = [0, 0.18, 0.34, 0.52, 0.72, 1]
  return (
    <div role="img" aria-label={ariaLabel} className="overflow-x-auto">
      <div className="grid min-w-[560px] grid-cols-[36px_repeat(24,minmax(0,1fr))] gap-px">
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="stamp text-center text-[10px] text-richblack-400">
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </span>
        ))}
        {rows.map((row, d) => (
          <React.Fragment key={d}>
            <span className="stamp self-center text-[10px] text-richblack-400">{DAYS[d]}</span>
            {row.map((v, h) => (
              <span
                key={h}
                title={`${DAYS[d]} ${String(h).padStart(2, "0")}:00 — ${v} ${unit}`}
                className={cn("heat-cell aspect-square", v === 0 && "bg-richblack-800")}
                style={
                  {
                    "--d": d + h,
                    ...(v > 0 ? { backgroundColor: `rgb(var(--accent-nav) / ${alpha[step(v)]})` } : {}),
                  } as React.CSSProperties
                }
              />
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <span className="stamp mr-1 text-[10px] text-richblack-400">Less</span>
        {alpha.slice(1).map((a) => (
          <span key={a} className="h-3 w-3" style={{ backgroundColor: `rgb(var(--accent-nav) / ${a})` }} />
        ))}
        <span className="stamp ml-1 text-[10px] text-richblack-400">More</span>
      </div>
    </div>
  )
}

interface ChartPanelProps {
  title: string
  subtitle?: string
  /** Every chart's numbers, readable without the canvas. */
  table?: { columns: string[]; rows: Array<Array<string | number>> }
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/** One chart as a cell of a `Ruled` grid (see DashKit). */
export function ChartPanel({ title, subtitle, table, action, className, children }: ChartPanelProps) {
  return (
    <div className={cn("min-w-0 bg-richblack-900 p-5", className)}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-richblack-5">{title}</h3>
          {subtitle && <p className="stamp mt-1 text-richblack-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
      {table && table.rows.length > 0 && (
        <details className="mt-4 border-t border-richblack-700 pt-3 text-sm print:hidden">
          <summary className="stamp cursor-pointer text-richblack-400 hover:text-richblack-5">View as table</summary>
          <div className="mt-2 max-h-64 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-richblack-300">
                  {table.columns.map((c) => (
                    <th key={c} scope="col" className="stamp py-1 pr-3 font-normal">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="figure text-richblack-100">
                {table.rows.map((row, i) => (
                  <tr key={i} className="border-t border-richblack-700">
                    {row.map((cell, j) => (
                      <td key={j} className="py-1 pr-3">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}

/** "2026-09-26" (a UTC day key from the API) as "26 Sep". */
export function shortDay(key: string): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}
