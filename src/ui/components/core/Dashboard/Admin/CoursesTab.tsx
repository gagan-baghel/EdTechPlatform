"use client"
import type { ModalData } from "@/ui/components/common/ConfirmationModal"

import { useEffect, useState, useCallback } from "react"
import { useSelector } from "react-redux"
import { Table, Tbody, Td, Th, Thead, Tr } from "react-super-responsive-table"

import { fetchCoursesForModeration, setCourseTakedown } from "../../../../services/operations/adminAPI"
import { formatCurrency } from "../../../../utils/formatCurrency"
import ConfirmationModal from "../../../common/ConfirmationModal"
import Spinner from "../../../common/Spinner"
import type { RootState } from "../../../../store"

interface CourseForModeration {
  _id: string
  courseName: string
  status: string
  price: number
  deletedAt?: string
  studentsEnrolled?: string[]
  instructor?: {
    firstName: string
    lastName: string
  }
}

export default function CoursesTab() {
  const { token } = useSelector((state: RootState) => state.auth)
  const [courses, setCourses] = useState<CourseForModeration[] | null>(null)
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [confirmationModal, setConfirmationModal] = useState<ModalData | null>(null)

  const load = useCallback(() => {
    fetchCoursesForModeration<CourseForModeration>(token as string, { includeDeleted: String(includeDeleted) })
      .then((result) => {
        if (result) setCourses(result.data)
      })
  }, [token, includeDeleted])

  useEffect(() => {
    load()
  }, [load])

  const handleTakedown = async (course: CourseForModeration) => {
    const takedown = !course.deletedAt
    await setCourseTakedown(token as string, course._id, takedown)
    await load()
    setConfirmationModal(null)
  }

  return (
    <div>
      <label className="mb-4 flex w-fit items-center gap-2 text-sm text-richblack-200">
        <input
          type="checkbox"
          checked={includeDeleted}
          onChange={(e) => setIncludeDeleted(e.target.checked)}
        />
        Show taken-down courses
      </label>

      {!courses ? (
        <Spinner />
      ) : courses.length === 0 ? (
        <p className="text-richblack-300">No courses found.</p>
      ) : (
        <Table className="rounded-md border border-richblack-700">
          <Thead>
            <Tr className="border-b border-richblack-700 text-left text-richblack-50">
              <Th className="px-4 py-3">Course</Th>
              <Th className="px-4 py-3">Instructor</Th>
              <Th className="px-4 py-3">Status</Th>
              <Th className="px-4 py-3">Price</Th>
              <Th className="px-4 py-3">Students</Th>
              <Th className="px-4 py-3">Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {courses.map((course) => (
              <Tr key={course._id} className="border-b border-richblack-800 text-richblack-100">
                <Td className="px-4 py-3">{course.courseName}</Td>
                <Td className="px-4 py-3">
                  {course.instructor?.firstName} {course.instructor?.lastName}
                </Td>
                <Td className="px-4 py-3">
                  <span className={course.deletedAt ? "text-pink-200" : "text-caribbeangreen-100"}>
                    {course.deletedAt ? "Taken down" : course.status}
                  </span>
                </Td>
                <Td className="px-4 py-3">{formatCurrency(course.price)}</Td>
                <Td className="px-4 py-3">{course.studentsEnrolled?.length ?? 0}</Td>
                <Td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmationModal({
                        text1: course.deletedAt ? "Restore this course?" : "Take down this course?",
                        text2: course.deletedAt
                          ? "It will reappear in the public catalog and search."
                          : "It disappears from listings and search. Enrolled students keep their access.",
                        btn1Text: "Confirm",
                        btn2Text: "Cancel",
                        btn1Handler: () => handleTakedown(course),
                        btn2Handler: () => setConfirmationModal(null),
                      })
                    }
                    className="text-sm font-semibold text-accent underline"
                  >
                    {course.deletedAt ? "Restore" : "Take down"}
                  </button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </div>
  )
}
