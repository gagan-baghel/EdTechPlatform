import { useEffect, useState } from "react"
import type { CourseDetail } from "@/ui/types"
import { useDispatch, useSelector } from "react-redux"
import { useParams } from "@/ui/lib/router"

import {
  getFullDetailsOfCourse,
} from "../../../../services/operations/courseDetailsAPI"
import { setCourse, setEditCourse } from "../../../../slices/courseSlice"
import RenderSteps from "../AddCourse/RenderSteps"
import Spinner from "../../../common/Spinner"
import type { RootState } from "../../../../store"
import type { AppDispatch } from "../../../../store"
import { PageHeader } from "../../../common/DashKit"

export default function EditCourse() {
  const dispatch = useDispatch<AppDispatch>()
  const { courseId } = useParams()
  const { course } = useSelector((state: RootState) => state.course)
  const [loading, setLoading] = useState(false)
  const { token } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const result = await getFullDetailsOfCourse<{ courseDetails: CourseDetail }>(
        courseId as string,
        token as string
      )
      if (result?.courseDetails) {
        dispatch(setEditCourse(true))
        dispatch(setCourse(result.courseDetails))
      }
      setLoading(false)
    })()
  }, [courseId, dispatch, token])

  if (loading) {
    return (
      <div className="grid flex-1 place-items-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Edit course" />
      <div className="mx-auto max-w-[600px]">
        {course ? (
          <RenderSteps />
        ) : (
          <p className="mt-14 text-center text-3xl font-semibold text-richblack-100">
            Course not found
          </p>
        )}
      </div>
    </div>
  )
}
