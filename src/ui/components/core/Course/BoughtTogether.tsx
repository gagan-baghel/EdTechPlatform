import type { ApiFailure } from "@/types/api"
import type { DataBody } from "@/ui/types"
import React, { useEffect, useState } from "react"
import Image from "next/image"
import { Link } from "@/ui/lib/router"
import { apiConnector } from "../../../services/apiconnector"
import { recommendationEndpoints } from "../../../services/apis"
import { formatCurrency } from "../../../utils/formatCurrency"
import type { CourseDetail } from "@/ui/types"

interface BoughtTogetherProps {
  courseId: string
}

export default function BoughtTogether({ courseId }: BoughtTogetherProps) {
  const [courses, setCourses] = useState<CourseDetail[]>([])

  useEffect(() => {
    if (!courseId) return
    ;(async () => {
      try {
        const response = await apiConnector<DataBody<CourseDetail[]> | ApiFailure>(
          "GET",
          recommendationEndpoints.BOUGHT_TOGETHER_API(courseId)
        )
        setCourses(response.data.success ? response.data.data : [])
      } catch {
        setCourses([])
      }
    })()
  }, [courseId])

  if (courses.length === 0) return null

  return (
    <div className="my-8 border border-richblack-600 p-8">
      <p className="mb-5 text-2xl font-semibold text-richblack-5">Frequently bought together</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {courses.map((course) => (
          <Link
            key={course._id}
            to={`/courses/${course._id}`}
            className="flex flex-col overflow-hidden rounded-md border border-richblack-700 hover:border-yellow-50"
          >
            <Image
              src={course.thumbnail}
              alt={course.courseName}
              width={200}
              height={110}
              className="h-24 w-full object-cover"
            />
            <div className="p-2">
              <p className="line-clamp-2 text-xs text-richblack-100">{course.courseName}</p>
              <p className="mt-1 text-sm font-semibold text-yellow-50">{formatCurrency(course.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
