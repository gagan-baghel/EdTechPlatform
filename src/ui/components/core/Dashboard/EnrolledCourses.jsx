import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import ProgressBar from "@ramonak/react-progress-bar"
import { TbBooks } from "react-icons/tb"
import { toast } from "react-hot-toast"
import { useSelector } from "react-redux"
import { Link, useNavigate } from "@/ui/lib/router"

import { getUserEnrolledCourses } from "../../../services/operations/profileAPI.js"
import Spinner from "../../common/Spinner"

export default function EnrolledCourses() {
  const { token } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  const [enrolledCourses, setEnrolledCourses] = useState(null)
  const getEnrolledCourses = useCallback(async () => {
    if (!token) {
      setEnrolledCourses([])
      return
    }

    try {
      const res = await getUserEnrolledCourses(token)
      setEnrolledCourses(Array.isArray(res) ? res : [])
    } catch (_error) {
      setEnrolledCourses([])
    }
  }, [token])

  useEffect(() => {
    getEnrolledCourses()
  }, [getEnrolledCourses])

  return (
    <>
      <div className="text-3xl text-richblack-50">Enrolled Courses</div>
      {!enrolledCourses ? (
        <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
          <Spinner />
        </div>
      ) : !enrolledCourses.length ? (
        <div className="mt-10 flex flex-col items-center rounded-lg border border-dashed border-richblack-600 bg-richblack-800/40 px-6 py-14 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-richblack-700">
            <TbBooks className="text-3xl text-yellow-50" />
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
            className="mt-6 rounded-md bg-yellow-50 px-6 py-3 font-semibold text-ink transition hover:bg-yellow-25 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50 focus-visible:ring-offset-2 focus-visible:ring-offset-richblack-900"
          >
            Browse courses
          </Link>
        </div>
      ) : (
        <div className="my-8 text-richblack-5">
          {/* Headings */}
          <div className="flex rounded-t-lg bg-richblack-500 ">
            <p className="w-[45%] px-5 py-3">Course Name</p>
            <p className="w-1/4 px-2 py-3">Duration</p>
            <p className="flex-1 px-2 py-3">Progress</p>
          </div>
          {/* Course Names */}
          {enrolledCourses.map((course, i, arr) => (
            <div
              className={`flex items-center border border-richblack-700 ${
                i === arr.length - 1 ? "rounded-b-lg" : "rounded-none"
              }`}
              key={i}
            >
              <div
                role="button"
                tabIndex={0}
                aria-label={`Continue ${course?.courseName ?? "course"}`}
                className="flex w-[45%] cursor-pointer items-center gap-4 px-5 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50 focus-visible:ring-inset"
                onClick={() => {
                  // Resume where the learner left off — find the section
                  // that contains lastWatchedSubSection, if there is one —
                  // rather than always reopening lesson 1 regardless of
                  // progress, which is what this did before.
                  let targetSection = course?.courseContent?.[0]
                  let targetLesson = targetSection?.subSection?.[0]

                  if (course?.lastWatchedSubSection) {
                    const resumeSection = course.courseContent?.find((section) =>
                      section.subSection?.some(
                        (lesson) => lesson._id === course.lastWatchedSubSection
                      )
                    )
                    const resumeLesson = resumeSection?.subSection?.find(
                      (lesson) => lesson._id === course.lastWatchedSubSection
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
                  className="h-14 w-14 rounded-lg object-cover"
                  sizes="56px"
                />
                <div className="flex max-w-xs flex-col gap-2">
                  <p className="font-semibold">{course.courseName}</p>
                  <p className="text-xs text-richblack-300">
                    {course.courseDescription.length > 50
                      ? `${course.courseDescription.slice(0, 50)}...`
                      : course.courseDescription}
                  </p>
                </div>
              </div>
              <div className="w-1/4 px-2 py-3">{course?.totalDuration}</div>
              <div className="flex w-1/5 flex-col gap-2 px-2 py-3">
                <p>Progress: {course.progressPercentage || 0}%</p>
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
