"use client"

import { useEffect, useState, useCallback } from "react"
import { useSelector } from "react-redux"
import Image from "next/image"
import { VscArrowRight } from "react-icons/vsc"
import { Link, useNavigate } from "@/ui/lib/router"

import { fetchWorkspace, removeCourseFromWishlist } from "../../../services/operations/workspaceAPI"
import { formatDate } from "../../../services/formatDate"
import { BarsChart, ChartPanel, shortDay } from "../../common/Charts"
import { Empty, Metric, PageHeader, ProgressBar, Ruled, Section } from "../../common/DashKit"
import type { RootState } from "../../../store"

interface ContinueLearningItem {
  course: { _id: string; courseName: string; thumbnail: string }
  lastWatchedSubSection: string | null
  completedCount: number
  totalLectures: number
  progressPercent: number
  resume: { sectionId: string; subSectionId: string } | null
}

interface CertificateSummary {
  _id: string
  certificateNumber: string
  course?: { courseName: string }
  issuedAt: string
}

interface CourseSummary {
  _id: string
  courseName: string
  thumbnail: string
}

/** Payload of GET /workspace — the student's learning home. */
interface WorkspaceData {
  continueLearning: ContinueLearningItem[]
  savedCourses: CourseSummary[]
  recentlyViewed: CourseSummary[]
  certificates: CertificateSummary[]
  streak: number
  activityByDay: Array<{ date: string; lecturesCompleted: number; minutes: number }>
  weeklyGoal: { goalMinutes: number; minutesLast7Days: number }
}

export default function MyLearning() {
  const { token } = useSelector((state: RootState) => state.auth)
  const { user } = useSelector((state: RootState) => state.profile)
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)

  const load = useCallback(() => {
    return fetchWorkspace<WorkspaceData>(token as string).then((result) => {
      setWorkspace(result)
    })
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const handleContinue = (item: ContinueLearningItem) => {
    // Straight into the player at the lecture last watched — this used to
    // open the course's sales page, one click and a scroll away from it.
    if (item.resume) {
      navigate(`/view-course/${item.course._id}/section/${item.resume.sectionId}/sub-section/${item.resume.subSectionId}`)
    } else {
      navigate(`/courses/${item.course._id}`)
    }
  }

  const handleUnsave = async (courseId: string) => {
    await removeCourseFromWishlist(token as string, courseId)
    void load()
  }

  const header = (
    <PageHeader
      title={user?.firstName ? `${user.firstName}'s learning` : "My learning"}
      meta={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
      actions={
        <Link to="/dashboard/scorecard" className="stamp inline-flex items-center gap-2 border border-richblack-600 px-3 py-2 text-richblack-5 hover:border-richblack-300">
          Scorecard <VscArrowRight aria-hidden />
        </Link>
      }
    />
  )

  if (!workspace) {
    return (
      <div aria-busy="true">
        {header}
        <div className="h-28 animate-pulse bg-richblack-800" />
      </div>
    )
  }

  const { weeklyGoal, activityByDay } = workspace
  const goalPercent = weeklyGoal.goalMinutes > 0 ? (weeklyGoal.minutesLast7Days / weeklyGoal.goalMinutes) * 100 : 0
  const inProgress = workspace.continueLearning.filter((c) => c.progressPercent < 100).length
  const lecturesThisMonth = activityByDay.reduce((sum, d) => sum + d.lecturesCompleted, 0)
  const [next, ...rest] = workspace.continueLearning

  return (
    <div>
      {header}

      <Ruled className="grid-cols-2 lg:grid-cols-4">
        <Metric label="Day streak" value={workspace.streak} hint={workspace.streak > 0 ? "Keep it going today" : "Watch a lecture to start one"} />
        <div className="min-w-0 bg-richblack-900 px-4 py-4 md:px-5 md:py-5">
          <p className="stamp text-richblack-300">Weekly goal</p>
          <p className="figure mt-3 text-[1.75rem] leading-none text-richblack-5 md:text-[2.125rem]">
            {weeklyGoal.minutesLast7Days}
            <span className="text-sm text-richblack-300"> / {weeklyGoal.goalMinutes || "—"} min</span>
          </p>
          {weeklyGoal.goalMinutes > 0 ? (
            <>
              <ProgressBar value={goalPercent} label="Weekly goal progress" className="mt-3" />
              <p className="mt-2 text-xs text-richblack-300">{goalPercent >= 100 ? "Goal met" : "Last 7 days"}</p>
            </>
          ) : (
            <Link to="/dashboard/settings#learning" className="mt-2 block text-xs font-semibold text-accent hover:underline">
              Set a weekly goal
            </Link>
          )}
        </div>
        <Metric label="In progress" value={inProgress} hint={`${lecturesThisMonth} lectures in 30 days`} />
        <Metric label="Certificates" value={workspace.certificates.length} />
      </Ruled>

      {next ? (
        <Section title="Pick up where you left off" className="mt-14">
          <button
            type="button"
            onClick={() => handleContinue(next)}
            className="group grid w-full grid-cols-1 border border-richblack-700 text-left transition-colors hover:border-richblack-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:grid-cols-[320px_1fr]"
          >
            <Image src={next.course.thumbnail} alt="" width={640} height={360} className="aspect-video h-full w-full object-cover" />
            <div className="flex flex-col justify-between gap-6 p-5 md:p-6">
              <div>
                <p className="stamp text-richblack-400">
                  {next.completedCount} of {next.totalLectures} lectures
                </p>
                <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-richblack-5 md:text-2xl">{next.course.courseName}</p>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <ProgressBar value={next.progressPercent} label={`${next.course.courseName} progress`} />
                  <span className="figure shrink-0 text-sm text-richblack-100">{Math.round(next.progressPercent)}%</span>
                </div>
                <span className="stamp mt-5 inline-flex items-center gap-2 bg-yellow-50 px-4 py-2.5 text-on-signal">
                  {next.progressPercent >= 100 ? "Review" : next.completedCount > 0 ? "Resume" : "Start"}
                  <VscArrowRight aria-hidden className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </button>

          {rest.length > 0 && (
            <ul className="mt-6 divide-y divide-richblack-700 border-y border-richblack-700">
              {rest.map((item) => (
                <li key={item.course._id}>
                  <button
                    type="button"
                    onClick={() => handleContinue(item)}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-4 py-3 text-left hover:bg-richblack-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:grid-cols-[minmax(0,1fr)_200px_auto]"
                  >
                    <span className="truncate text-sm text-richblack-5">{item.course.courseName}</span>
                    <span className="hidden items-center gap-3 sm:flex">
                      <ProgressBar value={item.progressPercent} label={`${item.course.courseName} progress`} />
                      <span className="figure w-10 shrink-0 text-right text-xs text-richblack-300">{Math.round(item.progressPercent)}%</span>
                    </span>
                    <span className="stamp text-accent">
                      {item.progressPercent >= 100 ? "Review" : item.completedCount > 0 ? "Resume" : "Start"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : (
        <div className="mt-14">
          <Empty title="You haven't started a course yet">
            <Link to="/search" className="font-semibold text-accent underline">
              Find something to learn
            </Link>
          </Empty>
        </div>
      )}

      <Section title="Last 30 days">
        <Ruled className="grid-cols-1">
          <ChartPanel
            title="Minutes learned"
            subtitle="Per day"
            table={{
              columns: ["Day", "Minutes", "Lectures completed"],
              rows: activityByDay.filter((d) => d.minutes || d.lecturesCompleted).map((d) => [shortDay(d.date), d.minutes, d.lecturesCompleted]),
            }}
          >
            <BarsChart
              height={180}
              labels={activityByDay.map((d) => shortDay(d.date))}
              series={[{ label: "Minutes", data: activityByDay.map((d) => d.minutes) }]}
              ariaLabel="Minutes spent learning each day for the last 30 days"
            />
          </ChartPanel>
        </Ruled>
      </Section>

      {workspace.certificates.length > 0 && (
        <Section title="Certificates" aside={<span className="stamp text-richblack-300">{workspace.certificates.length}</span>}>
          <ul className="divide-y divide-richblack-700 border-y border-richblack-700">
            {workspace.certificates.map((cert) => (
              <li key={cert._id}>
                <a
                  href={`/certificates/${cert.certificateNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="grid grid-cols-[1fr_auto] gap-4 py-3 hover:bg-richblack-800"
                >
                  <span className="truncate text-sm text-richblack-5">{cert.course?.courseName}</span>
                  <span className="stamp text-richblack-400">
                    {cert.certificateNumber} · {formatDate(cert.issuedAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {workspace.savedCourses.length > 0 && (
        <Section title="Saved for later">
          <ul className="divide-y divide-richblack-700 border-y border-richblack-700">
            {workspace.savedCourses.map((course) => (
              <li key={course._id} className="grid grid-cols-[64px_1fr_auto] items-center gap-4 py-3">
                <Image src={course.thumbnail} alt="" width={64} height={36} className="aspect-video w-16 object-cover" />
                <Link to={`/courses/${course._id}`} className="truncate text-sm text-richblack-5 hover:underline">
                  {course.courseName}
                </Link>
                <button type="button" onClick={() => handleUnsave(course._id)} className="stamp text-richblack-400 hover:text-richblack-5">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {workspace.recentlyViewed.length > 0 && (
        <Section title="Recently viewed">
          <ul className="divide-y divide-richblack-700 border-y border-richblack-700">
            {workspace.recentlyViewed.map((course) => (
              <li key={course._id}>
                <Link to={`/courses/${course._id}`} className="grid grid-cols-[64px_1fr] items-center gap-4 py-3 hover:bg-richblack-800">
                  <Image src={course.thumbnail} alt="" width={64} height={36} className="aspect-video w-16 object-cover" />
                  <span className="truncate text-sm text-richblack-100">{course.courseName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
