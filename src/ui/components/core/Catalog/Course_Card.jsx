import React, { useMemo } from "react"
import Image from "next/image"
import { Link } from "@/ui/lib/router"

import RatingStars from "../../common/RatingStars"
import GetAvgRating from "../../../utils/avgRating"

const Course_Card = ({ course, Height }) => {
  const avgReviewCount = useMemo(
    () => GetAvgRating(course.ratingAndReviews),
    [course.ratingAndReviews]
  )

  return (
    <Link to={`/courses/${course._id}`}>
      <div className="group overflow-hidden rounded-[28px] border border-white/10 bg-richblack-800/80 shadow-[0_18px_60px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_80px_rgba(0,0,0,0.32)]">
        <div className="overflow-hidden">
          <Image
            src={course?.thumbnail}
            alt="course thumnail"
            width={720}
            height={420}
            className={`${Height} w-full object-cover transition-transform duration-500 group-hover:scale-105`}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xl font-semibold leading-8 text-richblack-5">
              {course?.courseName}
            </p>
            <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-semibold text-[#fae27c]">
              Rs. {course?.price}
            </span>
          </div>
          <p className="text-sm text-richblack-200">
            {course?.instructor?.firstName} {course?.instructor?.lastName}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-yellow-5">{avgReviewCount || 0}</span>
            <RatingStars Review_Count={avgReviewCount} />
            <span className="text-sm text-richblack-400">
              {course?.ratingAndReviews?.length} Ratings
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default Course_Card
