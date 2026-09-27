import type { CourseListItem } from "@/ui/types"
import { useEffect, useState } from "react"
import { VscAdd } from "react-icons/vsc"
import { useSelector } from "react-redux"
import { useNavigate } from "@/ui/lib/router"

import { fetchInstructorCourses } from "../../../services/operations/courseDetailsAPI"
import IconBtn from "../../common/IconBtn"
import CoursesTable from "./InstructorCourses/CoursesTable"

import type { RootState } from "../../../store"
import { PageHeader } from "../../common/DashKit"

export default function MyCourses() {
  const { token } = useSelector((state: RootState) => state.auth)
  const navigate = useNavigate()
  const [courses, setCourses] = useState<CourseListItem[]>([])

  useEffect(() => { 
    const fetchCourses = async () => {
      const result = await fetchInstructorCourses<CourseListItem>(token as string)
      if (result) {
        setCourses(result)
      }
    }
    fetchCourses()
  }, [token])

  return (
    <div>
      <PageHeader
        title="My courses"
        meta={courses ? `${courses.length} course${courses.length === 1 ? "" : "s"}` : undefined}
        actions={
          <IconBtn text="New course" onClick={() => navigate("/dashboard/add-course")}>
            <VscAdd />
          </IconBtn>
        }
      />
      {courses && <CoursesTable courses={courses} setCourses={setCourses} />}
    </div>
  )
}
