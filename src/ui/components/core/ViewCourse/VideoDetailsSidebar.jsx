"use client"

import { useEffect, useState } from "react"
import { BsChevronDown } from "react-icons/bs"
import { IoIosArrowBack } from "react-icons/io"
import { AiOutlineClose } from "react-icons/ai"
import { useSelector } from "react-redux"
import { useLocation, useNavigate, useParams } from "@/ui/lib/router"

import IconBtn from "../../common/IconBtn"

export default function VideoDetailsSidebar({ setReviewModal, open = false, onClose }) {
  const [activeStatus, setActiveStatus] = useState("")
  const [videoBarActive, setVideoBarActive] = useState("")
  const navigate = useNavigate()
  const location = useLocation()
  const { sectionId, subSectionId } = useParams()
  const {
    courseSectionData,
    courseEntireData,
    totalNoOfLectures,
    completedLectures,
  } = useSelector((state) => state.viewCourse)

  useEffect(() => {
    if (!courseSectionData.length) return

    const currentSectionIndx = courseSectionData.findIndex(
      (data) => data._id === sectionId
    )
    const currentSubSectionIndx = courseSectionData?.[
      currentSectionIndx
    ]?.subSection?.findIndex((data) => data._id === subSectionId)
    const activeSubSectionId =
      courseSectionData[currentSectionIndx]?.subSection?.[currentSubSectionIndx]?._id

    setActiveStatus(courseSectionData?.[currentSectionIndx]?._id)
    setVideoBarActive(activeSubSectionId)
  }, [courseSectionData, sectionId, subSectionId, location.pathname])

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => e.key === "Escape" && onClose?.()
    document.addEventListener("keydown", onKeyDown)
    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  const goToLesson = (sectionIdValue, topicId) => {
    navigate(
      `/view-course/${courseEntireData?._id}/section/${sectionIdValue}/sub-section/${topicId}`
    )
    setVideoBarActive(topicId)
    onClose?.()
  }

  const completedCount = completedLectures?.length ?? 0
  const progressPct = totalNoOfLectures
    ? Math.round((completedCount / totalNoOfLectures) * 100)
    : 0

  return (
    <>
      {/* Mobile scrim */}
      {open && (
        <div
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Course content"
        className={`z-[95] flex w-[85%] max-w-[350px] shrink-0 flex-col border-r border-r-richblack-700 bg-richblack-800 transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"}
          fixed inset-y-0 left-0 h-full
          lg:static lg:h-[calc(100vh-3.5rem)] lg:w-[320px] lg:translate-x-0`}
      >
        <div className="mx-5 flex flex-col items-start justify-between gap-y-4 border-b border-richblack-600 py-5 text-lg font-bold text-richblack-25">
          <div className="flex w-full items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate("/dashboard/enrolled-courses")}
              className="flex h-[35px] w-[35px] items-center justify-center rounded-full bg-richblack-100 p-1 text-richblack-700 transition hover:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50"
              aria-label="Back to my courses"
            >
              <IoIosArrowBack size={26} />
            </button>
            <div className="flex items-center gap-2">
              <IconBtn text="Add Review" onClick={() => setReviewModal(true)} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close course content"
                className="rounded-full p-2 text-richblack-100 transition hover:bg-richblack-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50 lg:hidden"
              >
                <AiOutlineClose fontSize={18} />
              </button>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2">
            <p className="text-base">{courseEntireData?.courseName}</p>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-richblack-700"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Course progress"
            >
              <div
                className="h-full rounded-full bg-yellow-50 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-sm font-semibold text-richblack-300">
              {completedCount} of {totalNoOfLectures} lessons complete
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {courseSectionData.map((course) => {
            const expanded = activeStatus === course?._id

            return (
              <div className="mt-2 text-sm text-richblack-5" key={course._id}>
                <button
                  type="button"
                  onClick={() => setActiveStatus(expanded ? "" : course?._id)}
                  aria-expanded={expanded}
                  className="flex w-full flex-row items-center justify-between gap-3 bg-richblack-600 px-5 py-4 text-left transition hover:bg-richblack-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-50"
                >
                  <span className="w-[80%] font-semibold">{course?.sectionName}</span>
                  <BsChevronDown
                    className={`shrink-0 transition-transform duration-300 ${
                      expanded ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>

                {expanded && (
                  <div>
                    {course.subSection.map((topic) => {
                      const isComplete = completedLectures.includes(topic?._id)
                      const isActive = videoBarActive === topic._id

                      return (
                        <button
                          type="button"
                          key={topic._id}
                          onClick={() => goToLesson(course?._id, topic?._id)}
                          aria-current={isActive ? "true" : undefined}
                          className={`flex w-full items-center gap-3 px-5 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-50 ${
                            isActive
                              ? "bg-yellow-200 font-semibold text-richblack-800"
                              : "hover:bg-richblack-900"
                          }`}
                        >
                          <span
                            className={`grid h-4 w-4 shrink-0 place-items-center rounded-sm border text-[10px] ${
                              isComplete
                                ? "border-caribbeangreen-300 bg-caribbeangreen-300 text-richblack-900"
                                : "border-richblack-400"
                            }`}
                            aria-hidden="true"
                          >
                            {isComplete ? "✓" : ""}
                          </span>
                          <span className="flex-1">{topic.title}</span>
                          <span className="sr-only">
                            {isComplete ? "Completed" : "Not completed"}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>
    </>
  )
}
