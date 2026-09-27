import type { CourseSubSection, EnrolledCourse } from "@/ui/types"
import type { CourseSection } from "@/ui/types"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import ProgressBar from "@ramonak/react-progress-bar"
import { TbBooks } from "react-icons/tb"
import { toast } from "react-hot-toast"
import { useSelector } from "react-redux"
import { Link, useNavigate } from "@/ui/lib/router"

import { getUserEnrolledCourses } from "../../../services/operations/profileAPI"
import Spinner from "../../common/Spinner"
import type { RootState } from "../../../store"
import { PageHeader } from "../../common/DashKit"

export default function EnrolledCourses() {
  const { token } = useSelector((state: RootState) => state.auth)
  const navigate = useNavigate()

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[] | null>(null)
  const [prevToken, setPrevToken] = useState(token)

  if (token !== prevToken) {
    setPrevToken(token)
    if (!token) {
      setEnrolledCourses([])
    } else {
      setEnrolledCourses(null)
    }
  }
  
  const getEnrolledCourses = useCallback(() => {
    if (!token) return

    getUserEnrolledCourses<EnrolledCourse>(token)
      .then((res) => {
        setEnrolledCourses(Array.isArray(res) ? res : [])
      })
      .catch(() => {
        setEnrolledCourses([])
      })
  }, [token])

  useEffect(() => {
    if (token && enrolledCourses === null) {
      getEnrolledCourses()
    }
  }, [getEnrolledCourses, token, enrolledCourses])

  return (
    <>
      <PageHeader title="Enrolled courses" meta="Every course you have access to" />
      {!enrolledCourses ? (
        <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
          <Spinner />
        </div>
      ) : !enrolledCourses.length ? (
        <div className="mt-10 flex flex-col items-center rounded-lg border border-dashed border-richblack-600 bg-richblack-800/40 px-6 py-14 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-richblack-700">
            <TbBooks className="text-3xl text-accent" />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-richblack-5">
            You haven&apos;t enrolled in a course yet
          </h2>
          <p className="mt-2 max-w-sm text-richblack-300">
            Browse the catalog and pick something to start learning. Your courses
            and progress will show up here.
          </p>
          <Link
            to="/catalog/web-development"
            className="mt-6 rounded-md bg-yellow-50 px-6 py-3 font-semibold text-on-signal transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-richblack-900"
          >
            Browse courses
          </Link>
        </div>
      ) : (
        <div className="mt-6 text-richblack-5">
          {/* Column headings are meaningless once the rows stop being rows, so
              they are hidden on phones where each entry becomes a card. */}
          <div className="hidden rounded-t-lg bg-richblack-600 sm:flex">
            <p className="w-[45%] px-5 py-3">Course Name</p>
            <p className="w-1/4 px-2 py-3">Duration</p>
            <p className="flex-1 px-2 py-3">Progress</p>
          </div>
          {/* Course Names */}
          {enrolledCourses.map((course, i, arr) => (
            // A card on a phone, a table row from sm. Forced into a row at
            // 375px the title wrapped one word per line and the columns were
            // unreadable.
            <div
              className={`flex flex-col border border-richblack-700 sm:flex-row sm:items-center ${
                i === 0 ? "rounded-t-lg sm:rounded-t-none" : ""
              } ${i === arr.length - 1 ? "rounded-b-lg" : ""}`}
              key={i}
            >
              <div
                role="button"
                tabIndex={0}
                aria-label={`Continue ${course?.courseName ?? "course"}`}
                className="flex w-full cursor-pointer items-center gap-4 px-4 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:w-[45%] sm:px-5 sm:py-3"
                onClick={() => {
                  // Resume where the learner left off — find the section
                  // that contains lastWatchedSubSection, if there is one —
                  // rather than always reopening lesson 1 regardless of
                  // progress, which is what this did before.
                  let targetSection = course?.courseContent?.[0]
                  let targetLesson = targetSection?.subSection?.[0]

                  if (course?.lastWatchedSubSection) {
                    const resumeSection = course.courseContent?.find((section: CourseSection) =>
                      section.subSection?.some(
                        (lesson: CourseSubSection) => lesson._id === course.lastWatchedSubSection
                      )
                    )
                    const resumeLesson = resumeSection?.subSection?.find(
                      (lesson: CourseSubSection) => lesson._id === course.lastWatchedSubSection
                    )
                    if (resumeSection && resumeLesson) {
                      targetSection = resumeSection
                      targetLesson = resumeLesson
                    }
                  }

                  // Without this guard the ids stringify to "undefined" and the
                  // learner lands on a dead route.
                  if (!targetSection?._id || !targetLesson?._id) {
                    toast.error(
                      "This course has no lessons yet. You'll get access as soon as the instructor publishes them."
                    )
                    return
                  }

                  navigate(
                    `/view-course/${course._id}/section/${targetSection._id}/sub-section/${targetLesson._id}`
                  )
                }}
                onKeyDown={(e) => {
                  // role="button" on a div gets none of a real <button>'s
                  // built-in Enter/Space activation — this is what makes
                  // this row actually operable from a keyboard.
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    e.currentTarget.click()
                  }
                }}
              >
                <Image
                  src={course.thumbnail}
                  alt="course_img"
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  sizes="56px"
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-semibold">{course.courseName}</p>
                  <p className="text-xs text-richblack-300">
                    {course.courseDescription.length > 50
                      ? `${course.courseDescription.slice(0, 50)}...`
                      : course.courseDescription}
                  </p>
                </div>
              </div>
              <div className="px-4 pb-1 text-sm text-richblack-200 sm:w-1/4 sm:px-2 sm:py-3 sm:text-base sm:text-richblack-5">
                <span className="sm:hidden">Duration: </span>
                {course?.totalDuration}
              </div>
              <div className="flex flex-col gap-2 px-4 pb-4 sm:w-1/5 sm:px-2 sm:py-3">
                <p className="text-sm sm:text-base">
                  Progress: {course.progressPercentage || 0}%
                </p>
                <ProgressBar
                  completed={course.progressPercentage || 0}
                  height="8px"
                  isLabelVisible={false}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
