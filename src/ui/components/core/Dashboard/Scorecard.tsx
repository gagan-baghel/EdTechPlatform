"use client"

import { useCallback, useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { VscCheck, VscCircleLarge, VscClose, VscPass } from "react-icons/vsc"
import { Link } from "@/ui/lib/router"

import { fetchScorecard } from "../../../services/operations/workspaceAPI"
import { fetchQuizReview } from "../../../services/operations/quizAPI"
import { formatDate } from "../../../services/formatDate"
import { cn } from "../../../lib/cn"
import Button from "../../common/Button"
import Modal from "../../common/Modal"
import { BarsChart, ChartPanel, TrendChart } from "../../common/Charts"
import { Empty, Metric, PageHeader, ProgressBar, Ruled, Section, Th } from "../../common/DashKit"
import QuizReview, { type ReviewItem } from "../ViewCourse/QuizReview"
import type { RootState } from "../../../store"

interface ScorecardQuiz {
  quizId: string
  title: string
  scope: "course" | "lecture"
  passingScorePercent: number
  bestScore: number | null
  attempts: number
  passed: boolean
}

interface ScorecardCourse {
  courseId: string
  courseName: string
  thumbnail: string
  instructorName: string | null
  lectures: { completed: number; total: number }
  progressPercent: number
  quizzes: ScorecardQuiz[]
  quizAverage: number | null
  score: number
  grade: string
  rank: { position: number; of: number }
  leaderboard: Array<{ name: string; score: number; position: number; isYou: boolean }>
  certificate: { certificateNumber: string; issuedAt: string } | null
  lastActiveAt: string | null
}

/** Payload of GET /workspace/scorecard. */
interface ScorecardData {
  summary: {
    courses: number
    certificates: number
    lecturesCompleted: number
    averageProgress: number
    quizzesTaken: number
    quizzesPassed: number
    averageQuizScore: number | null
    overallScore: number
    grade: string
  }
  courses: ScorecardCourse[]
  quizHistory: Array<{ quizId: string; quizTitle: string; courseName: string; scorePercent: number; passed: boolean; at: string }>
}

interface ReviewPayload {
  title: string
  scorePercent: number
  passed: boolean
  review: ReviewItem[]
}

const MAX_ATTEMPTS = 10
const truncate = (text: string, n = 28) => (text.length > n ? `${text.slice(0, n - 1)}…` : text)

function QuizStatus({ quiz }: { quiz: ScorecardQuiz }) {
  if (quiz.attempts === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-richblack-300">
        <VscCircleLarge aria-hidden /> Not attempted
      </span>
    )
  }
  return quiz.passed ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-richblack-5">
      <VscCheck aria-hidden className="text-caribbeangreen-200" /> Passed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-richblack-5">
      <VscClose aria-hidden className="text-pink-200" /> Not yet
    </span>
  )
}

export default function Scorecard() {
  const { token } = useSelector((state: RootState) => state.auth)
  const { user } = useSelector((state: RootState) => state.profile)
  const [data, setData] = useState<ScorecardData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [review, setReview] = useState<ReviewPayload | null>(null)

  useEffect(() => {
    if (!token) return
    fetchScorecard<ScorecardData>(token).then((result) => {
      setData(result)
      setLoaded(true)
    })
  }, [token])

  const openReview = useCallback(
    async (quizId: string) => {
      if (!token) return
      const result = await fetchQuizReview<ReviewPayload>(token, quizId)
      if (result) setReview(result)
    },
    [token]
  )
  const closeReview = useCallback(() => setReview(null), [])

  const header = (meta?: string) => (
    <PageHeader
      title="Scorecard"
      meta={meta}
      actions={
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          Print report card
        </Button>
      }
    />
  )

  if (!loaded) {
    return (
      <div aria-busy="true">
        {header("Loading")}
        <div className="h-28 animate-pulse bg-richblack-800" />
      </div>
    )
  }
  if (!data) {
    return (
      <div>
        {header()}
        <Empty title="Your scorecard couldn't be loaded">Refresh the page to try again.</Empty>
      </div>
    )
  }

  const { summary, courses, quizHistory } = data
  const meta = `${user?.firstName ?? ""} ${user?.lastName ?? ""} · ${summary.courses} course${summary.courses === 1 ? "" : "s"} · as of ${formatDate(new Date().toISOString())}`

  if (courses.length === 0) {
    return (
      <div>
        {header(meta)}
        <Empty title="No results yet">
          Enrol in a course and your progress, quiz scores and grades appear here.{" "}
          <Link to="/search" className="font-semibold text-accent underline">
            Browse courses
          </Link>
        </Empty>
      </div>
    )
  }

  const byScore = [...courses].sort((a, b) => b.score - a.score)

  return (
    <div>
      {header(meta)}

      <Ruled className="grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <div className="flex items-center gap-4 bg-richblack-900 px-4 py-4 md:px-5 md:py-5">
          <span
            className="figure grid h-14 w-14 shrink-0 place-items-center border-2 border-richblack-5 text-3xl text-richblack-5"
            aria-label={`Overall grade ${summary.grade}`}
          >
            {summary.grade}
          </span>
          <div className="min-w-0">
            <p className="stamp text-richblack-300">Overall</p>
            <p className="figure mt-1 text-[1.75rem] leading-none text-richblack-5">{summary.overallScore}</p>
          </div>
        </div>
        <Metric label="Avg progress" value={`${summary.averageProgress}%`} hint={`${summary.lecturesCompleted} lectures done`} />
        <Metric label="Quizzes passed" value={`${summary.quizzesPassed}/${summary.quizzesTaken}`} hint="of those attempted" />
        <Metric label="Avg quiz score" value={summary.averageQuizScore === null ? "—" : `${summary.averageQuizScore}%`} hint="best attempt each" />
        <Metric label="Certificates" value={summary.certificates} hint={`of ${summary.courses} courses`} />
        <Metric label="Attempts" value={quizHistory.length} hint="all quizzes" />
      </Ruled>

      <Section title="Across your courses" className="mt-14">
        <Ruled className="lg:grid-cols-2">
          <ChartPanel
            title="Course scores"
            subtitle="Half lecture progress, half quiz average"
            table={{
              columns: ["Course", "Score", "Grade", "Position"],
              rows: byScore.map((c) => [c.courseName, c.score, c.grade, `${c.rank.position} of ${c.rank.of}`]),
            }}
          >
            <BarsChart
              horizontal
              height={Math.max(150, courses.length * 44)}
              labels={byScore.map((c) => truncate(c.courseName))}
              series={[{ label: "Score", data: byScore.map((c) => c.score) }]}
              ariaLabel="Your score in each course, highest first"
            />
          </ChartPanel>
          <ChartPanel
            title="Quiz scores over time"
            subtitle="Every attempt, oldest first"
            table={{
              columns: ["Date", "Quiz", "Course", "Score", "Result"],
              rows: quizHistory.map((q) => [formatDate(q.at), q.quizTitle, q.courseName, `${q.scorePercent}%`, q.passed ? "Passed" : "Not passed"]),
            }}
          >
            {quizHistory.length >= 2 ? (
              <TrendChart
                labels={quizHistory.map((_, i) => `#${i + 1}`)}
                series={[{ label: "Score", data: quizHistory.map((q) => q.scorePercent) }]}
                format={(v) => `${v}%`}
                ariaLabel="Your quiz scores across attempts"
              />
            ) : (
              <p className="py-10 text-sm text-richblack-300">Take a couple of quizzes and the trend appears here.</p>
            )}
          </ChartPanel>
        </Ruled>
      </Section>

      {courses.map((course) => (
        <section key={course.courseId} className="mt-14 break-inside-avoid">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-richblack-600 pb-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-richblack-5 md:text-2xl">{course.courseName}</h2>
              <p className="stamp mt-2 text-richblack-400">
                {course.instructorName ? `${course.instructorName} · ` : ""}
                {course.lastActiveAt ? `last active ${formatDate(course.lastActiveAt)}` : "not started"}
              </p>
            </div>
            <span
              className="figure grid h-16 w-16 place-items-center border-2 border-richblack-5 text-4xl text-richblack-5"
              aria-label={`Grade ${course.grade}`}
            >
              {course.grade}
            </span>
          </div>

          <Ruled className="border-t-0 grid-cols-2 md:grid-cols-4">
            <div className="min-w-0 bg-richblack-900 px-4 py-4 md:px-5">
              <p className="stamp text-richblack-300">Lectures</p>
              <p className="figure mt-3 text-2xl leading-none text-richblack-5">
                {course.lectures.completed}
                <span className="text-sm text-richblack-300">/{course.lectures.total}</span>
              </p>
              <ProgressBar value={course.progressPercent} label={`${course.courseName} progress`} className="mt-3" />
            </div>
            <Metric label="Course score" value={course.score} hint={course.quizAverage === null ? "progress only" : `quiz avg ${course.quizAverage}%`} />
            <Metric label="Class position" value={`#${course.rank.position}`} hint={`of ${course.rank.of} enrolled`} />
            <div className="min-w-0 bg-richblack-900 px-4 py-4 md:px-5">
              <p className="stamp text-richblack-300">Certificate</p>
              {course.certificate ? (
                <a
                  href={`/certificates/${course.certificate.certificateNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-richblack-5 underline decoration-accent underline-offset-4"
                >
                  <VscPass aria-hidden className="text-caribbeangreen-200" />
                  {course.certificate.certificateNumber}
                </a>
              ) : (
                <p className="mt-3 text-xs text-richblack-300">Finish every lecture and pass every course quiz.</p>
              )}
            </div>
          </Ruled>

          <Ruled className="border-t-0 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="min-w-0 bg-richblack-900 p-5">
              <h3 className="mb-3 text-sm font-semibold text-richblack-5">Quiz results</h3>
              {course.quizzes.length === 0 ? (
                <p className="text-sm text-richblack-300">This course has no quizzes.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-richblack-600">
                        <Th>Quiz</Th>
                        <Th className="text-right">Best</Th>
                        <Th className="text-right">Pass mark</Th>
                        <Th className="text-right">Attempts</Th>
                        <Th>Status</Th>
                        <Th className="print:hidden">
                          <span className="sr-only">Review</span>
                        </Th>
                      </tr>
                    </thead>
                    <tbody className="text-richblack-100">
                      {course.quizzes.map((quiz) => {
                        const canReview = quiz.passed || quiz.attempts >= MAX_ATTEMPTS
                        return (
                          <tr key={quiz.quizId} className="border-b border-richblack-700 last:border-0">
                            <td className="py-2.5 pr-4">
                              {quiz.title}
                              {quiz.scope === "lecture" && <span className="stamp ml-2 text-richblack-400">lecture</span>}
                            </td>
                            <td className="figure py-2.5 pr-4 text-right text-richblack-5">{quiz.bestScore === null ? "—" : `${quiz.bestScore}%`}</td>
                            <td className="figure py-2.5 pr-4 text-right">{quiz.passingScorePercent}%</td>
                            <td className="figure py-2.5 pr-4 text-right">
                              {quiz.attempts}/{MAX_ATTEMPTS}
                            </td>
                            <td className="py-2.5 pr-4">
                              <QuizStatus quiz={quiz} />
                            </td>
                            <td className="py-2.5 text-right print:hidden">
                              {canReview && (
                                <button type="button" onClick={() => openReview(quiz.quizId)} className="stamp text-accent hover:underline">
                                  Review
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="min-w-0 bg-richblack-900 p-5">
              <h3 className="mb-3 text-sm font-semibold text-richblack-5">Leaderboard</h3>
              {course.leaderboard.length === 0 ? (
                <p className="text-sm text-richblack-300">Nobody has scored yet.</p>
              ) : (
                <ol className="divide-y divide-richblack-700 border-y border-richblack-700 text-sm">
                  {course.leaderboard.map((entry, i) => (
                    <li
                      key={`${entry.name}-${i}`}
                      className={cn(
                        "grid grid-cols-[2.5rem_1fr_auto] items-center py-2",
                        entry.isYou ? "font-semibold text-richblack-5" : "text-richblack-100"
                      )}
                    >
                      <span className="figure text-richblack-400">{String(entry.position).padStart(2, "0")}</span>
                      <span className="flex items-center gap-2 truncate">
                        {entry.isYou && <span aria-hidden className="h-3 w-1 bg-accent" />}
                        {entry.name}
                      </span>
                      <span className="figure">{entry.score}</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-3 text-xs text-richblack-400 print:hidden">
                Hide your name from others in{" "}
                <Link to="/dashboard/settings#privacy" className="underline">
                  Settings
                </Link>
                .
              </p>
            </div>
          </Ruled>
        </section>
      ))}

      <Modal
        open={review !== null}
        onClose={closeReview}
        title={review ? `${review.title} · ${review.scorePercent}%` : ""}
        className="max-w-2xl"
      >
        {review && (
          // Focusable so the Modal's focus-on-open lands at the top (not on
          // Close at the bottom), and the list scrolls from the keyboard.
          <div tabIndex={0} aria-label="Answer review" className="mt-4 max-h-[70vh] overflow-y-auto pr-1 focus:outline-none">
            <QuizReview items={review.review} />
            <div className="mt-4 text-right">
              <Button size="sm" variant="outline" onClick={closeReview}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
