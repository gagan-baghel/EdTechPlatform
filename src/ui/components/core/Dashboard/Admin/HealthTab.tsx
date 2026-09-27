"use client"

import { useCallback, useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { VscCheck, VscClose, VscWarning } from "react-icons/vsc"

import { fetchSystemHealth } from "../../../../services/operations/adminAPI"
import { STATUS_COLORS } from "../../../common/Charts"
import { Metric, Ruled, Section } from "../../../common/DashKit"
import type { RootState } from "../../../../store"

/** Payload of GET /admin/health — also the body of its 503. */
interface HealthReport {
  checks: Record<string, unknown>
  databaseLatencyMs?: number
  attention?: Record<string, number> | null
  checkedAt?: string
}

const CHECK_LABELS: Record<string, string> = {
  cloudinaryConfigured: "Media storage (Cloudinary)",
  mailConfigured: "Email (SMTP)",
  razorpayConfigured: "Payments (Razorpay)",
  webhookConfigured: "Payment webhook secret",
  cronConfigured: "Scheduled jobs (CRON_SECRET)",
  encryptionConfigured: "Bank-detail encryption key",
  aiTutorConfigured: "AI tutor, assistant, copilot (Anthropic)",
  transcriptionConfigured: "Lecture transcription (OpenAI)",
}

const ATTENTION: Record<string, { label: string; tab: string }> = {
  failedTranscripts: { label: "Lecture transcriptions failed", tab: "Courses" },
  pendingKyc: { label: "Instructor KYC awaiting review", tab: "Instructor Payouts" },
  pendingPayouts: { label: "Payouts waiting to be paid", tab: "Instructor Payouts" },
  aiFailures24h: { label: "AI requests failed, 24h", tab: "Analytics" },
  abandonedCheckouts24h: { label: "Checkouts started, not paid, 24h", tab: "Payments & Orders" },
}

const REFRESH_MS = 30_000
const isOk = (value: unknown) => value === "ok" || value === true

export default function HealthTab() {
  const { token } = useSelector((state: RootState) => state.auth)
  const [report, setReport] = useState<HealthReport | null>(null)

  const load = useCallback(() => {
    if (!token) return
    fetchSystemHealth<HealthReport>(token).then((result) => {
      if (result) setReport(result)
    })
  }, [token])

  // Re-checked every 30s while the tab is open, so this can sit on a screen.
  useEffect(() => {
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  if (!report) return <div aria-busy="true" className="h-40 animate-pulse bg-richblack-800" />

  const { checks, attention } = report
  const dbUp = isOk(checks.database)
  const latency = report.databaseLatencyMs
  const slow = latency !== undefined && latency > 500
  const integrations = Object.entries(checks).filter(([key]) => key !== "database")
  const configured = integrations.filter(([, v]) => isOk(v)).length
  const waiting = attention ? Object.keys(ATTENTION).reduce((n, key) => n + ((attention[key] ?? 0) > 0 ? 1 : 0), 0) : 0

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="stamp text-richblack-400" aria-live="polite">
          Checked {report.checkedAt ? new Date(report.checkedAt).toLocaleTimeString() : "just now"} · every 30s
        </p>
        <button
          type="button"
          onClick={load}
          className="stamp border border-richblack-600 px-3 py-1.5 text-richblack-5 hover:border-richblack-300"
        >
          Check now
        </button>
      </div>

      <Ruled className="grid-cols-2 md:grid-cols-4">
        <Metric
          label="Database"
          value={
            <span className="inline-flex items-center gap-2">
              {dbUp && !slow ? (
                <VscCheck aria-hidden style={{ color: STATUS_COLORS.good }} />
              ) : (
                <VscClose aria-hidden style={{ color: STATUS_COLORS.critical }} />
              )}
              {dbUp ? (slow ? "Slow" : "Up") : "Down"}
            </span>
          }
          hint={dbUp ? "reachable" : "unreachable"}
        />
        <Metric label="Round trip" value={latency === undefined ? "—" : `${latency} ms`} hint="database ping" />
        <Metric label="Integrations" value={`${configured}/${integrations.length}`} hint="configured" />
        <Metric label="Waiting on you" value={waiting} hint="queues with items" />
      </Ruled>

      <Section title="Integrations" className="mt-14">
        <ul className="grid grid-cols-1 border-t border-richblack-600 md:grid-cols-2 md:gap-x-10">
          {integrations.map(([key, value]) => (
            <li key={key} className="flex items-center justify-between gap-3 border-b border-richblack-700 py-3 text-sm">
              <span className="text-richblack-5">{CHECK_LABELS[key] ?? key}</span>
              <span className="stamp inline-flex items-center gap-1.5 text-richblack-200">
                {isOk(value) ? (
                  <VscCheck aria-hidden style={{ color: STATUS_COLORS.good }} />
                ) : (
                  <VscClose aria-hidden style={{ color: STATUS_COLORS.critical }} />
                )}
                {isOk(value) ? "Configured" : "Missing"}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {attention && (
        <Section title="Needs attention">
          <ul className="border-t border-richblack-600">
            {Object.entries(ATTENTION).map(([key, { label, tab }]) => {
              const count = attention[key] ?? 0
              return (
                <li key={key} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-richblack-700 py-3 text-sm">
                  {count > 0 ? (
                    <VscWarning aria-hidden className="text-accent" />
                  ) : (
                    <VscCheck aria-hidden style={{ color: STATUS_COLORS.good }} />
                  )}
                  <span className="text-richblack-100">
                    {label}
                    {key === "aiFailures24h" && (attention.aiCalls24h ?? 0) > 0 && (
                      <span className="text-richblack-400"> · of {attention.aiCalls24h}</span>
                    )}
                    {count > 0 && <span className="stamp ml-3 text-richblack-400">see {tab}</span>}
                  </span>
                  <span className="figure text-lg text-richblack-5">{count}</span>
                </li>
              )
            })}
          </ul>
        </Section>
      )}
    </div>
  )
}
