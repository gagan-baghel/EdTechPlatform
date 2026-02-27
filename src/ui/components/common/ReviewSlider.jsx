import React, { useEffect, useMemo, useState } from "react"
import ReactStars from "react-rating-stars-component"
import { Swiper, SwiperSlide } from "swiper/react"

import "swiper/css"
import "swiper/css/free-mode"
import "swiper/css/pagination"

import { FaStar } from "react-icons/fa"
import { Autoplay, FreeMode, Pagination } from "swiper"

import { apiConnector } from "../../services/apiconnector"
import { ratingsEndpoints } from "../../services/apis"

const fallbackReviews = [
  {
    rating: 5,
    review: "perfect course for aws",
    course: { courseName: "AWS" },
    user: { firstName: "gagan", lastName: "baghel", image: "" },
  },
]

function normalizeReview(review) {
  const firstName = review?.user?.firstName || "gagan"
  const lastName = review?.user?.lastName || "baghel"
  const parsedRating = Number(review?.rating)

  return {
    name: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    image: review?.user?.image || "",
    courseName: review?.course?.courseName || "AWS",
    reviewText:
      typeof review?.review === "string" && review.review.trim()
        ? review.review
        : "perfect course for aws",
    rating: Number.isFinite(parsedRating)
      ? Math.min(5, Math.max(0, parsedRating))
      : 5,
  }
}

function ReviewSlider() {
  const [reviews, setReviews] = useState([])
  const truncateWords = 15

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await apiConnector("GET", ratingsEndpoints.REVIEWS_DETAILS_API)
        if (data?.success && Array.isArray(data?.data)) {
          setReviews(data.data)
        }
      } catch (error) {
        console.log("Could not fetch reviews", error)
      }
    })()
  }, [])

  const renderedReviews = useMemo(() => {
    const source = reviews.length ? reviews : fallbackReviews
    return source.map(normalizeReview)
  }, [reviews])

  return (
    <div className="w-full text-richblack-900">
      <div className="my-10 max-w-maxContentTab lg:max-w-maxContent">
        <Swiper
          slidesPerView={1}
          spaceBetween={25}
          loop={true}
          freeMode={true}
          breakpoints={{
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
            1280: { slidesPerView: 4 },
          }}
          autoplay={{
            delay: 2500,
            disableOnInteraction: false,
          }}
          modules={[FreeMode, Pagination, Autoplay]}
          className="w-full"
        >
          {renderedReviews.map((review, i) => {
            return (
              <SwiperSlide key={`${review.name}-${i}`}>
                <div className="flex min-h-[180px] flex-col gap-3 rounded-md border border-[#dce9e7] bg-[#f6fbfb] p-4 text-[14px] text-[#0d6770]">
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        review.image
                          ? review.image
                          : `https://api.dicebear.com/5.x/initials/svg?seed=${review.firstName} ${review.lastName}`
                      }
                      alt={review.name}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <div className="flex flex-col">
                      <h1 className="font-semibold text-[#0d6770]">{review.name}</h1>
                      <h2 className="text-[12px] font-medium text-[#6e9094]">{review.courseName}</h2>
                    </div>
                  </div>
                  <p className="font-medium text-[#4b6f73]">
                    {review.reviewText.split(" ").length > truncateWords
                      ? `${review.reviewText.split(" ").slice(0, truncateWords).join(" ")} ...`
                      : review.reviewText}
                  </p>
                  <div className="flex items-center gap-2 ">
                    <h3 className="font-semibold text-[#0d6770]">{review.rating.toFixed(1)}</h3>
                    <ReactStars
                      count={5}
                      value={review.rating}
                      size={20}
                      edit={false}
                      activeColor="#ffd700"
                      emptyIcon={<FaStar />}
                      fullIcon={<FaStar />}
                    />
                  </div>
                </div>
              </SwiperSlide>
            )
          })}
        </Swiper>
      </div>
    </div>
  )
}

export default ReviewSlider
