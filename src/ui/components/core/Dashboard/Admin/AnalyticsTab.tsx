"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"

import { fetchAnalyticsOverview } from "../../../../services/operations/adminAPI"
import { formatCurrency } from "../../../../utils/formatCurrency"
import { BarsChart, ChartPanel, STATUS_COLORS, TrendChart, shortDay } from "../../../common/Charts"
import { Metric, RangePicker, Ruled, Section, Th } from "../../../common/DashKit"
import type { RootState } from "../../../../store"

/** Payload of GET /admin/analytics. */
interface AnalyticsData {
  rangeDays: number
  revenueTotalRupees: number
  revenueByDay: Array<{ date: string; amountRupees: number }>
  completionRate: number
  refundRate: number
  aiInteractionCount: number
  funnel: { viewed: number; checkoutStarted: number; purchased: number }
  topCourses: Array<{ _id: string; courseName: string; revenue: number; sales: number }>
  growthByDay: Array<{ date: string; signups: number; activeUsers: number; enrollments: number }>
  aiByDay: Array<{ date: string; succeeded: number; failed: number }>
  usersByRole: Record<string, number>
  coursesByStatus: Record<string, number>
  quizzes: { attempts: number; passRate: number | null; averageScore: number | null }
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 1000) / 10}%` : "—")
const truncate = (text: string, n = 30) => (text.length > n ? `${text.slice(0, n - 1)}…` : text)

export default function AnalyticsTab() {
  const { token } = useSelector((state: RootState) => state.auth)
  const [days, setDays] = useState(30)
  const [data, setData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    if (!token) return
    fetchAnalyticsOverview<AnalyticsData>(token, days).then(setData)
  }, [token, days])

  if (!data) return <div aria-busy="true" className="h-40 animate-pulse bg-richblack-800" />

  const { funnel, growthByDay, aiByDay } = data
  const labels = growthByDay.map((d) => shortDay(d.date))
  const revenueInRange = sum(data.revenueByDay.map((d) => d.amountRupees))
  const aiFailed = sum(aiByDay.map((d) => d.failed))
  const aiTotal = aiFailed + sum(aiByDay.map((d) => d.succeeded))
  const peakActive = Math.max(0, ...growthByDay.map((d) => d.activeUsers))
  const roles = Object.entries(data.usersByRole).sort((a, b) => b[1] - a[1])
  const topCourses = data.topCourses.slice(0, 8)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="stamp text-richblack-400">Last {days} days unless marked · UTC days</p>
        <RangePicker value={days} onChange={setDays} />
      </div>

      <Ruled className="grid-cols-2 md:grid-cols-4">
        <Metric label={`Revenue ${days}d`} value={formatCurrency(revenueInRange)} hint={`${formatCurrency(data.revenueTotalRupees)} all time`} />
        <Metric label={`Signups ${days}d`} value={sum(growthByDay.map((d) => d.signups))} hint={`${sum(Object.values(data.usersByRole))} users total`} />
        <Metric label="Peak daily active" value={peakActive} hint={`${growthByDay.at(-1)?.activeUsers ?? 0} today`} />
        <Metric label={`Enrolments ${days}d`} value={sum(growthByDay.map((d) => d.enrollments))} />
        <Metric label="Completion rate" value={`${data.completionRate}%`} hint="all time" />
        <Metric label="Refund rate" value={`${data.refundRate}%`} hint="all time" />
        <Metric
          label={`Quiz pass rate ${days}d`}
          value={data.quizzes.passRate === null ? "—" : `${data.quizzes.passRate}%`}
          hint={`${data.quizzes.attempts} attempts`}
        />
        <Metric label={`AI failure rate ${days}d`} value={pct(aiFailed, aiTotal)} hint={`${aiTotal} requests`} />
      </Ruled>

      <Section title="Money and growth" className="mt-14">
        <Ruled className="lg:grid-cols-2">
          <ChartPanel
            title="Revenue"
            subtitle="Per day"
            table={{
              columns: ["Day", "Revenue"],
              rows: data.revenueByDay.filter((d) => d.amountRupees > 0).map((d) => [shortDay(d.date), formatCurrency(d.amountRupees)]),
            }}
          >
            <TrendChart
              labels={data.revenueByDay.map((d) => shortDay(d.date))}
              series={[{ label: "Revenue", data: data.revenueByDay.map((d) => d.amountRupees) }]}
              format={(v) => formatCurrency(v)}
              ariaLabel={`Daily revenue, last ${days} days`}
            />
          </ChartPanel>
          <ChartPanel
            title="People"
            subtitle="Active users, signups and enrolments per day"
            table={{
              columns: ["Day", "Active", "Signups", "Enrolments"],
              rows: growthByDay.map((d) => [shortDay(d.date), d.activeUsers, d.signups, d.enrollments]),
            }}
          >
            <TrendChart
              labels={labels}
              series={[
                { label: "Active users", data: growthByDay.map((d) => d.activeUsers) },
                { label: "Signups", data: growthByDay.map((d) => d.signups) },
                { label: "Enrolments", data: growthByDay.map((d) => d.enrollments) },
              ]}
              ariaLabel="Daily active users, signups and enrolments"
            />
          </ChartPanel>
        </Ruled>
      </Section>

      <Section title="Conversion and reliability">
        <Ruled className="lg:grid-cols-2">
          <ChartPanel
            title="Conversion funnel"
            subtitle={`Viewed to checkout ${pct(funnel.checkoutStarted, funnel.viewed)} · checkout to paid ${pct(funnel.purchased, funnel.checkoutStarted)}`}
            table={{
              columns: ["Step", "Events"],
              rows: [
                ["Viewed a course", funnel.viewed],
                ["Started checkout", funnel.checkoutStarted],
                ["Purchased", funnel.purchased],
              ],
            }}
          >
            <BarsChart
              horizontal
              height={170}
              labels={["Viewed", "Checkout", "Purchased"]}
              series={[{ label: "Events", data: [funnel.viewed, funnel.checkoutStarted, funnel.purchased] }]}
              ariaLabel="Conversion funnel from course views to purchases"
            />
          </ChartPanel>
          <ChartPanel
            title="AI requests"
            subtitle="Tutor, assistant and copilot, per day"
            table={{
              columns: ["Day", "Succeeded", "Failed"],
              rows: aiByDay.filter((d) => d.succeeded || d.failed).map((d) => [shortDay(d.date), d.succeeded, d.failed]),
            }}
          >
            <BarsChart
              stacked
              height={170}
              labels={aiByDay.map((d) => shortDay(d.date))}
              series={[
                { label: "Succeeded", data: aiByDay.map((d) => d.succeeded) },
                { label: "Failed", data: aiByDay.map((d) => d.failed), color: STATUS_COLORS.critical },
              ]}
              ariaLabel="Succeeded and failed AI requests per day"
            />
          </ChartPanel>
        </Ruled>
      </Section>

      <Section title="Catalogue">
        <Ruled className="lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ChartPanel
            title="Top courses by revenue"
            subtitle="All time"
            table={{ columns: ["Course", "Revenue", "Sales"], rows: data.topCourses.map((c) => [c.courseName, formatCurrency(c.revenue), c.sales]) }}
          >
            {topCourses.length === 0 ? (
              <p className="py-8 text-sm text-richblack-300">No sales yet.</p>
            ) : (
              <BarsChart
                horizontal
                height={Math.max(150, topCourses.length * 40)}
                labels={topCourses.map((c) => truncate(c.courseName))}
                series={[{ label: "Revenue", data: topCourses.map((c) => c.revenue) }]}
                format={(v) => formatCurrency(v)}
                ariaLabel="Top courses by all-time revenue"
              />
            )}
          </ChartPanel>
          <div className="min-w-0 bg-richblack-900 p-5">
            <h3 className="mb-3 text-sm font-semibold text-richblack-5">Users and courses</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-richblack-600">
                  <Th>Group</Th>
                  <Th className="text-right">Count</Th>
                </tr>
              </thead>
              <tbody className="text-richblack-100">
                {roles.map(([role, count]) => (
                  <tr key={role} className="border-b border-richblack-700">
                    <td className="py-2 pr-4">{role}s</td>
                    <td className="figure py-2 text-right text-richblack-5">{count}</td>
                  </tr>
                ))}
                {Object.entries(data.coursesByStatus).map(([status, count]) => (
                  <tr key={status} className="border-b border-richblack-700 last:border-0">
                    <td className="py-2 pr-4">{status} courses</td>
                    <td className="figure py-2 text-right text-richblack-5">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Ruled>
      </Section>
    </div>
  )
}
