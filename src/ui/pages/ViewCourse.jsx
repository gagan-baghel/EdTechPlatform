"use client"

import { useCallback, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { HiOutlineMenuAlt2 } from "react-icons/hi"
import { Link, useParams } from "@/ui/lib/router"

import CourseReviewModal from "../components/core/ViewCourse/CourseReviewModal"
import VideoDetailsSidebar from "../components/core/ViewCourse/VideoDetailsSidebar"
import QuizList from "../components/core/ViewCourse/QuizList"
import LiveSessionList from "../components/core/ViewCourse/LiveSessionList"
import QnAPanel from "../components/core/ViewCourse/QnAPanel"
import TutorPanel from "../components/core/ViewCourse/TutorPanel"
import { getFullDetailsOfCourse } from "../services/operations/courseDetailsAPI"
import {
  setCompletedLectures,
  setCourseSectionData,
  setEntireCourseData,
  setTotalNoOfLectures,
  setWatchState,
} from "../slices/viewCourseSlice"

export default function ViewCourse({ children }) {
  const { courseId, subSectionId } = useParams()
  const { token } = useSelector((state) => state.auth)
  const dispatch = useDispatch()

  const [reviewModal, setReviewModal] = useState(false)
  const [status, setStatus] = useState("loading") // loading | ready | empty | error
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const loadCourse = useCallback(async () => {
    setStatus("loading")

    try {
      const courseData = await getFullDetailsOfCourse(courseId, token)
      const details = courseData?.courseDetails

      if (!details) {
        setStatus("error")
        return
      }

      const content = details.courseContent ?? []
      dispatch(setCourseSectionData(content))
      dispatch(setEntireCourseData(details))
      dispatch(setCompletedLectures(courseData.completedVideos ?? []))
      dispatch(setWatchState(courseData.watchState ?? []))

      const lectures = content.reduce(
        (total, section) => total + (section?.subSection?.length ?? 0),
        0
      )
      dispatch(setTotalNoOfLectures(lectures))

      setStatus(lectures === 0 ? "empty" : "ready")
    } catch (error) {
      console.error("Failed to load course", error)
      setStatus("error")
    }
  }, [courseId, token, dispatch])

  useEffect(() => {
    loadCourse()
  }, [loadCourse])

  if (status === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
        <div className="hidden w-[320px] shrink-0 animate-pulse border-r border-richblack-700 bg-richblack-800 lg:block" />
        <div className="flex-1 p-6">
          <div className="aspect-video w-full animate-pulse rounded-lg bg-richblack-800" />
          <div className="mt-6 h-7 w-2/3 animate-pulse rounded bg-richblack-800" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-richblack-800" />
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold text-richblack-5">
            We could not load this course
          </h1>
          <p className="mt-3 text-richblack-300">
            This can happen if your session expired or the connection dropped. Your
            enrolment is safe.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loadCourse}
              className="rounded-md bg-yellow-50 px-5 py-2 font-semibold text-ink transition hover:bg-yellow-25"
            >
              Try again
            </button>
            <Link
              to="/dashboard/enrolled-courses"
              className="rounded-md border border-richblack-600 px-5 py-2 font-semibold text-richblack-5 transition hover:bg-richblack-700"
            >
              Back to my courses
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (status === "empty") {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold text-richblack-5">
            No lessons published yet
          </h1>
          <p className="mt-3 text-richblack-300">
            The instructor has not added any lessons to this course. You keep full
            access for whenever they do.
          </p>
          <Link
            to="/dashboard/enrolled-courses"
            className="mt-6 inline-block rounded-md bg-yellow-50 px-5 py-2 font-semibold text-ink transition hover:bg-yellow-25"
          >
            Back to my courses
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
        {/* On mobile the lesson list is a drawer so the video keeps full width */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-2 border-b border-richblack-700 bg-richblack-800 px-5 py-3 text-sm font-semibold text-richblack-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50 lg:hidden"
          aria-expanded={sidebarOpen}
        >
          <HiOutlineMenuAlt2 fontSize={20} />
          Course content
        </button>

        <VideoDetailsSidebar
          setReviewModal={setReviewModal}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="min-h-0 flex-1 overflow-y-auto lg:h-[calc(100vh-3.5rem)]">
          <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6">
            {children}
            {subSectionId && <TutorPanel subSectionId={subSectionId} />}
            <QuizList courseId={courseId} />
            <LiveSessionList courseId={courseId} />
            {subSectionId && <QnAPanel courseId={courseId} subSectionId={subSectionId} />}
          </div>
        </div>
      </div>
      {reviewModal && <CourseReviewModal setReviewModal={setReviewModal} />}
    </>
  )
}
