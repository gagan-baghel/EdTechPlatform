import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "@/ui/lib/router"

import { editCourseDetails } from "../../../../../services/operations/courseDetailsAPI"
import { resetCourseState, setStep } from "../../../../../slices/courseSlice"
import { COURSE_STATUS } from "../../../../../utils/constants"
import IconBtn from "../../../../common/IconBtn"

export default function PublishCourse() {
  const { register, handleSubmit, setValue, getValues, watch } = useForm()

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const { course } = useSelector((state) => state.course)
  const [loading, setLoading] = useState(false)

  const isPublic = watch("public")

  useEffect(() => {
    if (course?.status === COURSE_STATUS.PUBLISHED) {
      setValue("public", true)
    }
    if (course?.scheduledPublishAt) {
      // datetime-local wants "YYYY-MM-DDTHH:mm", not an ISO string
      setValue("scheduledPublishAt", new Date(course.scheduledPublishAt).toISOString().slice(0, 16))
    }
  }, [course?.status, course?.scheduledPublishAt, setValue])

  const goBack = () => {
    dispatch(setStep(2))
  }

  const goToCourses = () => {
    dispatch(resetCourseState())
    navigate("/dashboard/my-courses")
  }

  const handlePreview = () => {
    const firstSection = course?.courseContent?.[0]
    const firstSubSection = firstSection?.subSection?.[0]
    if (!firstSection || !firstSubSection) return
    navigate(
      `/view-course/${course._id}/section/${firstSection._id}/sub-section/${firstSubSection._id}`
    )
  }

  const onSubmit = async (data) => {
    const scheduling = !data.public && data.scheduledPublishAt

    // No-op guard: nothing changed since the course was last saved.
    if (
      (course?.status === COURSE_STATUS.PUBLISHED && data.public === true && !course?.scheduledPublishAt) ||
      (course?.status === COURSE_STATUS.DRAFT && data.public === false && !scheduling && !course?.scheduledPublishAt)
    ) {
      goToCourses()
      return
    }

    const formData = new FormData()
    formData.append("courseId", course._id)
    formData.append("status", data.public ? COURSE_STATUS.PUBLISHED : COURSE_STATUS.DRAFT)
    // Publishing immediately or unscheduling both clear any pending
    // schedule — sending "" rather than omitting the key, since editCourse
    // only touches fields present in the body.
    formData.append(
      "scheduledPublishAt",
      scheduling ? new Date(data.scheduledPublishAt).toISOString() : ""
    )

    setLoading(true)
    const result = await editCourseDetails(formData, token)
    if (result) {
      goToCourses()
    }
    setLoading(false)
  }

  return (
    <div className="rounded-md border-[1px] border-richblack-700 bg-richblack-800 p-6">
      <p className="text-2xl font-semibold text-richblack-5">
        Publish Settings
      </p>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Checkbox */}
        <div className="my-6 mb-4">
          <label htmlFor="public" className="inline-flex items-center text-lg">
            <input
              type="checkbox"
              id="public"
              {...register("public")}
              className="border-gray-300 h-4 w-4 rounded bg-richblack-500 text-richblack-400 focus:ring-2 focus:ring-richblack-5"
            />
            <span className="ml-2 text-richblack-400">
              Make this course as public
            </span>
          </label>
        </div>

        {!isPublic && (
          <div className="mb-8 flex flex-col gap-2">
            <label htmlFor="scheduledPublishAt" className="text-sm text-richblack-300">
              Or schedule it to publish automatically at a later time
            </label>
            <input
              type="datetime-local"
              id="scheduledPublishAt"
              {...register("scheduledPublishAt")}
              min={new Date().toISOString().slice(0, 16)}
              className="form-style w-fit"
            />
          </div>
        )}

        {/* Next Prev Button */}
        <div className="ml-auto flex max-w-max items-center gap-x-4">
          <button
            disabled={loading}
            type="button"
            onClick={goBack}
            className="flex cursor-pointer items-center gap-x-2 rounded-md bg-richblack-300 py-[8px] px-[20px] font-semibold text-richblack-900"
          >
            Back
          </button>
          <button
            disabled={loading}
            type="button"
            onClick={handlePreview}
            className="flex cursor-pointer items-center gap-x-2 rounded-md border border-richblack-500 py-[8px] px-[20px] font-semibold text-richblack-5"
          >
            Preview as student
          </button>
          <IconBtn disabled={loading} text="Save Changes" />
        </div>
      </form>
    </div>
  )
}
