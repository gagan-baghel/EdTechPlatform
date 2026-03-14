import React from "react"

import { Swiper, SwiperSlide } from "swiper/react"
import "swiper/css"
import "swiper/css/free-mode"
import "swiper/css/pagination"
import { FreeMode, Pagination } from "swiper"

import Course_Card from "./Course_Card"

const CourseSlider = ({ Courses }) => {
  return (
    <div>
      {Courses?.length ? (
        <Swiper
          slidesPerView={1.08}
          spaceBetween={20}
          loop={Courses.length > 3}
          modules={[FreeMode, Pagination]}
          breakpoints={{
            768: {
              slidesPerView: 2,
            },
            1024: {
              slidesPerView: 3,
            },
          }}
          className="!pb-12"
        >
          {Courses?.map((course, i) => (
            <SwiperSlide key={i} className="h-auto">
              <Course_Card course={course} Height={"h-[250px]"} />
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        <p className="text-lg text-richblack-300">No courses found.</p>
      )}
    </div>
  )
}

export default CourseSlider
