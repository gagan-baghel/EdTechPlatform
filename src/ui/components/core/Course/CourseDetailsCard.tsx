import React, { useState } from "react"
import copy from "copy-to-clipboard"
import { toast } from "react-hot-toast"
import { useTranslations } from "next-intl"
import { BsFillCaretRightFill } from "react-icons/bs"
import { FaShareSquare } from "react-icons/fa"
import { FiBookmark } from "react-icons/fi"
import { useSelector } from "react-redux"
import { useNavigate } from "@/ui/lib/router"

import { formatCurrency } from "../../../utils/formatCurrency"
import { saveCourseToWishlist, removeCourseFromWishlist } from "../../../services/operations/workspaceAPI"
import CurrencyHint from "./CurrencyHint"
import Image from "next/image"
import type { RootState } from "../../../store"
import type { CourseDetail } from "@/ui/types"

interface CourseDetailsCardProps {
  course: CourseDetail
  handleBuyCourse: () => void
  handleAddToCart: () => void
}

function CourseDetailsCard({ course, handleBuyCourse, handleAddToCart }: CourseDetailsCardProps) {
  const { user } = useSelector((state: RootState) => state.profile)
  const { token } = useSelector((state: RootState) => state.auth)
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const t = useTranslations("CourseCard")

  const handleToggleSave = async () => {
    if (!token) {
      navigate("/login")
      return
    }
    if (saved) {
      await removeCourseFromWishlist(token, course._id)
      setSaved(false)
    } else {
      await saveCourseToWishlist(token, course._id)
      setSaved(true)
    }
  }

  const {
    thumbnail: ThumbnailImage,
    price: CurrentPrice,
  } = course

  const handleShare = () => {
    copy(window.location.href)
    toast.success("Link copied to clipboard")
  }

  return (
    <>
      <div
        className={`flex flex-col gap-4 rounded-md bg-richblack-700 p-4 text-richblack-5`}
      >
        <Image
          src={ThumbnailImage}
          alt={course?.courseName ?? "Course thumbnail"}
          width={400}
          height={300}
          priority
          sizes="(max-width: 768px) 100vw, 400px"
          className="max-h-[300px] min-h-[180px] w-[400px] overflow-hidden rounded-2xl object-cover md:max-w-full"
        />

        <div className="px-4">
          <div className="pb-4">
            <div className="space-x-3 text-3xl font-semibold">
              {formatCurrency(CurrentPrice)}
            </div>
            <CurrencyHint amountRupees={CurrentPrice} />
          </div>
          <div className="flex flex-col gap-4">
            <button
              className="yellowButton"
              onClick={
                user && course?.studentsEnrolled.includes(user?._id)
                  ? () => navigate("/dashboard/enrolled-courses")
                  : handleBuyCourse
              }
            >
              {user && course?.studentsEnrolled.includes(user?._id)
                ? t("goToCourse")
                : t("buyNow")}
            </button>
            {(!user || !course?.studentsEnrolled.includes(user?._id)) && (
              <button onClick={handleAddToCart} className="blackButton">
                {t("addToCart")}
              </button>
            )}
          </div>
          <div className={`pt-6`}>
            <p className={`my-2 text-xl font-semibold `}>
              This Course Includes :
            </p>
            <div className="flex flex-col gap-3 text-sm text-caribbeangreen-100">
              {course?.instructions?.map((item, i) => {
                return (
                  <p className={`flex gap-2`} key={i}>
                    <BsFillCaretRightFill />
                    <span>{item}</span>
                  </p>
                )
              })}
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 py-6">
            <button
              className="flex items-center gap-2 text-yellow-100"
              onClick={handleShare}
            >
              <FaShareSquare size={15} /> {t("share")}
            </button>
            {(!user || !course?.studentsEnrolled.includes(user?._id)) && (
              <button
                className="flex items-center gap-2 text-richblack-100 hover:text-yellow-50"
                onClick={handleToggleSave}
              >
                <FiBookmark size={15} className={saved ? "fill-yellow-50" : ""} />
                {saved ? t("saved") : t("saveForLater")}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default CourseDetailsCard
