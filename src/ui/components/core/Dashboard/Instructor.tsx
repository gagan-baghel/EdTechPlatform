"use client"

import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import { VscArrowRight, VscCircleLarge, VscPass, VscWarning } from "react-icons/vsc"
import { Link } from "@/ui/lib/router"

import { getInstructorData } from "../../../services/operations/profileAPI"
import { formatCurrency } from "../../../utils/formatCurrency"
import { cn } from "../../../lib/cn"
import { BarsChart, ChartPanel, Heatmap, STATUS_COLORS, TrendChart, shortDay, useChartTheme } from "../../common/Charts"
import { Empty, Metric, PageHeader, ProgressBar, RangePicker, Ruled, Section, Th } from "../../common/DashKit"
import type { RootState } from "../../../store"

type LearnerStatus = "at_risk" | "not_started" | "on_track" | "completed"

/** Payload of GET /profile/instructorDashboard. */
interface DashboardData {
  rangeDays: number
  timezone: string
  totals: {
    courses: number
    publishedCourses: number
    students: number
    enrollments: number
    revenue: number
    revenueInRange: number
    enrollmentsInRange: number
    averageRating: number | null
    completionRate: number
    averageQuizScore: number | null
  }
  timeline: Array<{
    date: string
    revenue: number
    enrollments: number
    activeLearners: number
    lecturesCompleted: number
    minutesWatched: number
  }>
  studyHeatmap: number[][]
  progressDistribution: Array<{ label: string; learners: number }>
  statusByCourse: Array<{ courseId: string; courseName: string; counts: Record<LearnerStatus, number> }>
  courses: Array<{
    _id: string
    courseName: string
    status: string
    students: number
    completions: number
    revenue: number
    averageProgress: number
    completionRate: number
    averageRating: number | null
    reviews: number
    ratingStars: number[]
    averageQuizScore: number | null
    lectureFunnel: Array<{ title: string; section: string; completedPercent: number }>
  }>
  learners: {
    counts: Record<LearnerStatus, number>
    total: number
    rows: Array<{
      userId: string
      name: string
      courseId: string
      courseName: string
      progressPercent: number
      score: number
      quizAverage: number | null
      lastActiveAt: string | null
      status: LearnerStatus
    }>
  }
  quizzes: Array<{
    quizId: string
    title: string
    courseName: string
    published: boolean
    attempts: number
    students: number
    passRate: number | null
    averageScore: number | null
    scoreDistribution: number[]
    hardestQuestions: Array<{ questionText: string; answered: number; correctRate: number | null }>
  }>
}

const STATUS_ORDER: LearnerStatus[] = ["at_risk", "not_started", "on_track", "completed"]
const STATUS: Record<LearnerStatus, { label: string; Icon: typeof VscPass; iconClass: string; style?: React.CSSProperties }> = {
  at_risk: { label: "At risk", Icon: VscWarning, iconClass: "", style: { color: STATUS_COLORS.critical } },
  not_started: { label: "Not started", Icon: VscCircleLarge, iconClass: "text-richblack-400" },
  on_track: { label: "On track", Icon: VscArrowRight, iconClass: "text-richblack-100" },
  completed: { label: "Completed", Icon: VscPass, iconClass: "", style: { color: STATUS_COLORS.good } },
}

function StatusMark({ status }: { status: LearnerStatus }) {
  const { label, Icon, iconClass, style } = STATUS[status]
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-richblack-100">
      <Icon aria-hidden className={iconClass} style={style} />
      {label}
    </span>
  )
}

function lastSeen(iso: string | null): string {
  if (!iso) return "—"
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  return `${days}d ago`
}

const truncate = (text: string, n = 28) => (text.length > n ? `${text.slice(0, n - 1)}…` : text)
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
const PAGE = 25
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const SCORE_BUCKETS = ["0–9", "10–19", "20–29", "30–39", "40–49", "50–59", "60–69", "70–79", "80–89", "90–100"]
const browserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

export default function Instructor() {
  const { token } = useSelector((state: RootState) => state.auth)
  const { user } = useSelector((state: RootState) => state.profile)
  const theme = useChartTheme()
  const [days, setDays] = useState(30)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState<LearnerStatus | "all">("all")
  const [query, setQuery] = useState("")
  const [shown, setShown] = useState(PAGE)
  const [funnelCourse, setFunnelCourse] = useState<string | null>(null)
  const savedTimeZone = user?.additionalDetails?.timezone

  useEffect(() => {
    if (!token) return
    getInstructorData<DashboardData>(token, days, savedTimeZone || browserTimeZone()).then((result) => {
      setData(result)
      setLoaded(true)
    })
  }, [token, days, savedTimeZone])

  const learners = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.learners.rows ?? []).filter(
      (r) =>
        (filter === "all" || r.status === filter) &&
        (!q || r.name.toLowerCase().includes(q) || r.courseName.toLowerCase().includes(q))
    )
  }, [data, filter, query])

  const actions = (
    <>
      <RangePicker value={days} onChange={setDays} />
      <Link to="/dashboard/add-course" className="stamp bg-yellow-50 px-3 py-2 text-on-signal hover:brightness-95">
        New course
      </Link>
    </>
  )

  if (!loaded) {
    return (
      <div aria-busy="true">
        <PageHeader title="Teaching" meta="Loading" actions={actions} />
        <div className="h-40 animate-pulse bg-richblack-800" />
      </div>
    )
  }
  if (!data) {
    return (
      <div>
        <PageHeader title="Teaching" actions={actions} />
        <Empty title="Your dashboard couldn't be loaded">Refresh the page to try again.</Empty>
      </div>
    )
  }

  const { totals, timeline, courses, quizzes } = data
  const counts = data.learners.counts

  if (totals.courses === 0) {
    return (
      <div>
        <PageHeader title="Teaching" actions={actions} />
        <Empty title="No courses yet">
          <Link to="/dashboard/add-course" className="font-semibold text-accent underline">
            Create your first course
          </Link>{" "}
          and its sales, learners and results will appear here.
        </Empty>
      </div>
    )
  }

  const labels = timeline.map((d) => shortDay(d.date))
  const byRevenue = [...courses].sort((a, b) => b.revenue - a.revenue)
  const funnel = courses.find((c) => c._id === funnelCourse) ?? courses[0]!
  const stars = funnelCourse
    ? funnel.ratingStars
    : [0, 1, 2, 3, 4].map((i) => sum(courses.map((c) => c.ratingStars[i] ?? 0)))
  const minutesInRange = sum(timeline.map((d) => d.minutesWatched))
  const peakLearners = Math.max(0, ...timeline.map((d) => d.activeLearners))
  const heatTotal = sum(data.studyHeatmap.flat())
  const busiest = data.studyHeatmap
    .flatMap((row, d) => row.map((v, h) => ({ d, h, v })))
    .sort((a, b) => b.v - a.v)[0]

  return (
    <div>
      <PageHeader
        title="Teaching"
        meta={`${user?.firstName ?? ""} ${user?.lastName ?? ""} · ${totals.courses} courses · ${totals.students} students · last ${days} days`}
        actions={actions}
      />

      <Ruled className="grid-cols-2 md:grid-cols-4">
        <Metric label={`Revenue ${days}d`} value={formatCurrency(totals.revenueInRange)} hint={`${formatCurrency(totals.revenue)} all time`} />
        <Metric label={`Enrolments ${days}d`} value={totals.enrollmentsInRange} hint={`${totals.enrollments} all time`} />
        <Metric label="Peak daily learners" value={peakLearners} hint={`${timeline.at(-1)?.activeLearners ?? 0} today`} />
        <Metric label={`Minutes watched ${days}d`} value={minutesInRange.toLocaleString()} hint={`${sum(timeline.map((d) => d.lecturesCompleted))} lectures completed`} />
        <Metric label="Completion rate" value={`${totals.completionRate}%`} hint="earned a certificate" />
        <Metric
          label="Average rating"
          value={totals.averageRating ?? "—"}
          hint={totals.averageRating ? `from ${sum(courses.map((c) => c.reviews))} reviews` : "no reviews yet"}
        />
        <Metric label="Average quiz score" value={totals.averageQuizScore === null ? "—" : `${totals.averageQuizScore}%`} hint="all attempts" />
        <Metric
          label="Need attention"
          value={
            <span className="inline-flex items-center gap-2">
              {counts.at_risk > 0 && <VscWarning aria-hidden className="text-2xl" style={{ color: STATUS_COLORS.critical }} />}
              {counts.at_risk}
            </span>
          }
          hint="idle 14+ days or never started"
        />
      </Ruled>

      <Section title="Revenue and enrolments" className="mt-14">
        <Ruled className="lg:grid-cols-2">
          <ChartPanel
            title="Revenue"
            subtitle="Per day"
            table={{ columns: ["Day", "Revenue"], rows: timeline.filter((d) => d.revenue > 0).map((d) => [shortDay(d.date), formatCurrency(d.revenue)]) }}
          >
            <TrendChart
              labels={labels}
              series={[{ label: "Revenue", data: timeline.map((d) => d.revenue) }]}
              format={(v) => formatCurrency(v)}
              ariaLabel={`Daily revenue, last ${days} days`}
            />
          </ChartPanel>
          <ChartPanel
            title="New enrolments"
            subtitle="Per day"
            table={{ columns: ["Day", "Enrolments"], rows: timeline.filter((d) => d.enrollments > 0).map((d) => [shortDay(d.date), d.enrollments]) }}
          >
            <BarsChart labels={labels} series={[{ label: "Enrolments", data: timeline.map((d) => d.enrollments) }]} ariaLabel={`Daily enrolments, last ${days} days`} />
          </ChartPanel>
        </Ruled>
      </Section>

      <Section title="Learning activity">
        <Ruled className="lg:grid-cols-2">
          <ChartPanel
            title="Minutes watched"
            subtitle="All your courses, per day"
            table={{
              columns: ["Day", "Minutes", "Lectures completed"],
              rows: timeline.filter((d) => d.minutesWatched || d.lecturesCompleted).map((d) => [shortDay(d.date), d.minutesWatched, d.lecturesCompleted]),
            }}
          >
            <BarsChart labels={labels} series={[{ label: "Minutes", data: timeline.map((d) => d.minutesWatched) }]} ariaLabel="Minutes of lectures watched per day" />
          </ChartPanel>
          <ChartPanel
            title="Active learners"
            subtitle="Distinct students watching, per day"
            table={{ columns: ["Day", "Learners"], rows: timeline.filter((d) => d.activeLearners).map((d) => [shortDay(d.date), d.activeLearners]) }}
          >
            <TrendChart labels={labels} series={[{ label: "Learners", data: timeline.map((d) => d.activeLearners) }]} ariaLabel="Distinct active learners per day" />
          </ChartPanel>
          <ChartPanel
            className="lg:col-span-2"
            title="When your students study"
            subtitle={`Minutes watched by weekday and hour · ${data.timezone}${
              busiest && busiest.v > 0 ? ` · busiest ${DAYS[busiest.d]} ${String(busiest.h).padStart(2, "0")}:00` : ""
            }`}
            table={{
              columns: ["Day", ...Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"))],
              rows: heatTotal > 0 ? data.studyHeatmap.map((row, d) => [DAYS[d]!, ...row]) : [],
            }}
          >
            {heatTotal > 0 ? (
              <Heatmap rows={data.studyHeatmap} unit="min" ariaLabel="Heatmap of minutes watched by weekday and hour of day" />
            ) : (
              <p className="py-8 text-sm text-richblack-300">No lecture activity in this period yet.</p>
            )}
          </ChartPanel>
        </Ruled>
      </Section>

      <Section
        title="Courses"
        aside={
          <Link to="/dashboard/my-courses" className="stamp text-accent hover:underline">
            Manage courses
          </Link>
        }
      >
        <Ruled className="lg:grid-cols-2">
          <ChartPanel
            title="Revenue by course"
            subtitle="All time, highest first"
            table={{ columns: ["Course", "Revenue", "Students"], rows: byRevenue.map((c) => [c.courseName, formatCurrency(c.revenue), c.students]) }}
          >
            <BarsChart
              horizontal
              height={Math.max(150, courses.length * 44)}
              labels={byRevenue.map((c) => truncate(c.courseName))}
              series={[{ label: "Revenue", data: byRevenue.map((c) => c.revenue) }]}
              format={(v) => formatCurrency(v)}
              ariaLabel="Revenue per course, sorted"
            />
          </ChartPanel>
          <ChartPanel
            title="Where learners stand"
            subtitle="Learners per course, by status"
            table={{
              columns: ["Course", ...STATUS_ORDER.map((s) => STATUS[s].label)],
              rows: data.statusByCourse.map((c) => [c.courseName, ...STATUS_ORDER.map((s) => c.counts[s])]),
            }}
          >
            <BarsChart
              horizontal
              stacked
              height={Math.max(150, courses.length * 44 + 40)}
              labels={data.statusByCourse.map((c) => truncate(c.courseName))}
              series={[
                { label: "At risk", data: data.statusByCourse.map((c) => c.counts.at_risk), color: STATUS_COLORS.critical },
                { label: "Not started", data: data.statusByCourse.map((c) => c.counts.not_started), color: theme.muted },
                { label: "On track", data: data.statusByCourse.map((c) => c.counts.on_track), color: theme.series[0] },
                { label: "Completed", data: data.statusByCourse.map((c) => c.counts.completed), color: STATUS_COLORS.good },
              ]}
              ariaLabel="Stacked bars of learners per course by status"
            />
          </ChartPanel>

          <div className="min-w-0 bg-richblack-900 p-5 lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-richblack-5">Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-richblack-600">
                    <Th>Course</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Students</Th>
                    <Th className="text-right">Revenue</Th>
                    <Th>Avg progress</Th>
                    <Th className="text-right">Completion</Th>
                    <Th className="text-right">Rating</Th>
                    <Th className="text-right">Quiz avg</Th>
                  </tr>
                </thead>
                <tbody className="text-richblack-100">
                  {courses.map((c) => (
                    <tr key={c._id} className="border-b border-richblack-700 last:border-0">
                      <td className="max-w-[240px] truncate py-3 pr-4 text-richblack-5">{c.courseName}</td>
                      <td className="stamp py-3 pr-4 text-richblack-300">{c.status}</td>
                      <td className="figure py-3 pr-4 text-right">{c.students}</td>
                      <td className="figure py-3 pr-4 text-right">{formatCurrency(c.revenue)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={c.averageProgress} label={`${c.courseName} average progress`} className="w-20" />
                          <span className="figure text-xs">{Math.round(c.averageProgress)}%</span>
                        </div>
                      </td>
                      <td className="figure py-3 pr-4 text-right">{c.completionRate}%</td>
                      <td className="figure py-3 pr-4 text-right">{c.averageRating === null ? "—" : `${c.averageRating} (${c.reviews})`}</td>
                      <td className="figure py-3 pr-4 text-right">{c.averageQuizScore === null ? "—" : `${c.averageQuizScore}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ChartPanel
            title="Lecture drop-off"
            subtitle={`Share of enrolled learners who finished each lecture · ${funnel.courseName}`}
            action={
              courses.length > 1 && (
                <select
                  value={funnel._id}
                  onChange={(e) => setFunnelCourse(e.target.value)}
                  aria-label="Course for drop-off and ratings"
                  className="form-style max-w-[200px] py-1 text-xs"
                >
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.courseName}
                    </option>
                  ))}
                </select>
              )
            }
            table={{
              columns: ["#", "Lecture", "Section", "Finished"],
              rows: funnel.lectureFunnel.map((l, i) => [i + 1, l.title, l.section, `${l.completedPercent}%`]),
            }}
          >
            {funnel.lectureFunnel.length > 0 ? (
              <BarsChart
                labels={funnel.lectureFunnel.map((l, i) => `${i + 1}. ${truncate(l.title, 14)}`)}
                series={[{ label: "Finished", data: funnel.lectureFunnel.map((l) => l.completedPercent) }]}
                format={(v) => `${v}%`}
                ariaLabel="Share of learners who finished each lecture, in course order"
              />
            ) : (
              <p className="py-8 text-sm text-richblack-300">This course has no lectures yet.</p>
            )}
          </ChartPanel>
          <ChartPanel
            title="Ratings"
            subtitle={funnelCourse ? funnel.courseName : "All courses"}
            table={{ columns: ["Stars", "Reviews"], rows: [5, 4, 3, 2, 1].map((star) => [`${star}`, stars[star - 1] ?? 0]) }}
          >
            {sum(stars) > 0 ? (
              <BarsChart
                horizontal
                height={220}
                labels={["5 stars", "4 stars", "3 stars", "2 stars", "1 star"]}
                series={[{ label: "Reviews", data: [5, 4, 3, 2, 1].map((star) => stars[star - 1] ?? 0) }]}
                ariaLabel="Number of reviews at each star rating"
              />
            ) : (
              <p className="py-8 text-sm text-richblack-300">No reviews yet.</p>
            )}
          </ChartPanel>
        </Ruled>
      </Section>

      <Section title="Learners" aside={<span className="stamp text-richblack-300">{data.learners.total} enrolments</span>}>
        <Ruled className="grid-cols-1">
          <ChartPanel
            title="Progress distribution"
            subtitle="Enrolments by share of lectures completed"
            table={{ columns: ["Progress", "Learners"], rows: data.progressDistribution.map((b) => [b.label, b.learners]) }}
          >
            <BarsChart
              height={180}
              labels={data.progressDistribution.map((b) => b.label)}
              series={[{ label: "Learners", data: data.progressDistribution.map((b) => b.learners) }]}
              ariaLabel="Number of learners in each progress band"
            />
          </ChartPanel>

          <div className="min-w-0 bg-richblack-900 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div role="group" aria-label="Filter learners by status" className="flex flex-wrap border border-richblack-600">
                {(["all", ...STATUS_ORDER] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={filter === key}
                    onClick={() => {
                      setFilter(key)
                      setShown(PAGE)
                    }}
                    className={cn(
                      "stamp px-3 py-1.5 transition-colors",
                      filter === key ? "bg-richblack-5 text-richblack-900" : "text-richblack-300 hover:text-richblack-5"
                    )}
                  >
                    {key === "all" ? `All ${data.learners.total}` : `${STATUS[key].label} ${counts[key]}`}
                  </button>
                ))}
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShown(PAGE)
                }}
                placeholder="Search student or course"
                aria-label="Search learners"
                className="form-style w-full max-w-xs py-1.5 text-sm"
              />
            </div>
            <p className="mb-3 text-xs text-richblack-300">At risk: enrolled a week or more and idle for 14+ days, or never started.</p>
            {learners.length === 0 ? (
              <p className="py-6 text-sm text-richblack-300">No learners match.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-richblack-600">
                      <Th>Student</Th>
                      <Th>Course</Th>
                      <Th>Progress</Th>
                      <Th className="text-right">Score</Th>
                      <Th className="text-right">Quiz avg</Th>
                      <Th className="text-right">Last active</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody className="text-richblack-100">
                    {learners.slice(0, shown).map((r) => (
                      <tr key={`${r.userId}-${r.courseId}`} className="border-b border-richblack-700 last:border-0">
                        <td className="py-2.5 pr-4 text-richblack-5">{r.name}</td>
                        <td className="max-w-[200px] truncate py-2.5 pr-4">{r.courseName}</td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <ProgressBar value={r.progressPercent} label={`${r.name} progress`} className="w-20" />
                            <span className="figure text-xs">{Math.round(r.progressPercent)}%</span>
                          </div>
                        </td>
                        <td className="figure py-2.5 pr-4 text-right">{r.score}</td>
                        <td className="figure py-2.5 pr-4 text-right">{r.quizAverage === null ? "—" : `${r.quizAverage}%`}</td>
                        <td className="figure py-2.5 pr-4 text-right text-xs">{lastSeen(r.lastActiveAt)}</td>
                        <td className="py-2.5 pr-4">
                          <StatusMark status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {learners.length > shown && (
              <button type="button" onClick={() => setShown((n) => n + PAGE)} className="stamp mt-4 text-accent hover:underline">
                Show {Math.min(PAGE, learners.length - shown)} more
              </button>
            )}
            {data.learners.total > data.learners.rows.length && (
              <p className="mt-2 text-xs text-richblack-400">
                Showing the {data.learners.rows.length} learners who most need attention, of {data.learners.total}.
              </p>
            )}
          </div>
        </Ruled>
      </Section>

      <Section title="Quizzes">
        {quizzes.length === 0 ? (
          <Empty title="No quizzes yet">Add one from a course&apos;s builder — the AI copilot can draft it from your lectures.</Empty>
        ) : (
          <Ruled className="lg:grid-cols-2">
            {quizzes.map((quiz, i) => (
              <div
                key={quiz.quizId}
                className={cn(
                  "min-w-0 bg-richblack-900 p-5",
                  quizzes.length % 2 === 1 && i === quizzes.length - 1 && "lg:col-span-2"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-richblack-5">{quiz.title}</h3>
                    <p className="stamp mt-1 truncate text-richblack-400">
                      {quiz.courseName}
                      {!quiz.published && " · draft"}
                    </p>
                  </div>
                  <p className="stamp shrink-0 text-richblack-400">
                    {quiz.students} students · {quiz.attempts} attempts
                  </p>
                </div>
                <dl className="mt-4 grid grid-cols-2 border-y border-richblack-700 py-3">
                  <div>
                    <dt className="stamp text-richblack-400">Pass rate</dt>
                    <dd className="figure mt-1 text-2xl text-richblack-5">{quiz.passRate === null ? "—" : `${quiz.passRate}%`}</dd>
                  </div>
                  <div>
                    <dt className="stamp text-richblack-400">Average score</dt>
                    <dd className="figure mt-1 text-2xl text-richblack-5">{quiz.averageScore === null ? "—" : `${quiz.averageScore}%`}</dd>
                  </div>
                </dl>
                {quiz.students > 0 && (
                  <div className="mt-4">
                    <p className="stamp mb-2 text-richblack-400">Best score per student</p>
                    <BarsChart
                      height={140}
                      labels={SCORE_BUCKETS}
                      series={[{ label: "Students", data: quiz.scoreDistribution }]}
                      ariaLabel={`Distribution of students' best scores on ${quiz.title}`}
                    />
                  </div>
                )}
                {quiz.hardestQuestions.length > 0 && (
                  <div className="mt-4">
                    <p className="stamp mb-2 text-richblack-400">Most-missed questions</p>
                    <ul className="divide-y divide-richblack-700 border-y border-richblack-700">
                      {quiz.hardestQuestions.map((q) => (
                        <li key={q.questionText} className="py-2 text-sm">
                          <div className="flex justify-between gap-3">
                            <span className="truncate text-richblack-100">{q.questionText}</span>
                            <span className="figure shrink-0 text-xs text-richblack-300">{q.correctRate}% right</span>
                          </div>
                          <ProgressBar value={q.correctRate ?? 0} label={`${q.questionText}: share answered correctly`} className="mt-1.5" />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </Ruled>
        )}
      </Section>
    </div>
  )
}
