import React from "react"
import Instructor from "../../../assets/Images/Instructor.png"
import HighlightText from "./HighlightText"
import CTAButton from "../HomePage/Button"
import { FaArrowRight } from "react-icons/fa"

const InstructorSection: React.FC = () => {
  return (
    <div className="mt-16">
      <div className="flex flex-row gap-20 items-center">
        <div className="w-[50%]">
          <img
            src={typeof Instructor === 'string' ? Instructor : Instructor.src}
            alt="Instructor"
            className="shadow-white"
          />
        </div>

        <div className="w-[50%] flex flex-col gap-10">
          <div className="w-[50%] text-4xl font-semibold text-richblack-5">
            Become an
            <HighlightText text={"Instructor"} />
          </div>

          <p className="font-medium text-[16px] w-[80%] text-richblack-300">
            Instructors from around the world teach millions of students on
            IntelleCraft. We provide the tools and skills to teach what you
            love.
          </p>

          <div className="w-fit">
            <CTAButton active={true} linkto={"/signup"}>
              <div className="flex flex-row gap-2 items-center">
                Start Learning Today
                <FaArrowRight />
              </div>
            </CTAButton>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InstructorSection
