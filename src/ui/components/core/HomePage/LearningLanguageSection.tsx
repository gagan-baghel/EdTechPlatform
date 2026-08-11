import React from "react"
import HighlightText from "./HighlightText"
import know_your_progress from "../../../assets/Images/Know_your_progress.png"
import compare_with_others from "../../../assets/Images/Compare_with_others.png"
import plan_your_lesson from "../../../assets/Images/Plan_your_lessons.png"
import CTAButton from "../HomePage/Button"

const LearningLanguageSection: React.FC = () => {
  return (
    <div className="mt-[130px] mb-32">
      <div className="flex flex-col gap-5 items-center">
        <div className="text-4xl font-semibold text-center text-richblack-5">
          Your Swiss Knife for
          <HighlightText text={" learning any language"} />
        </div>

        <div className="mx-auto w-[70%] text-center text-base font-medium text-richblack-300">
          Using spin making learning multiple languages easy. with 20+ languages
          realistic voice-over, progress tracking, custom schedule and more.
        </div>

        <div className="flex flex-row items-center justify-center mt-5">
          <img
            src={typeof know_your_progress === 'string' ? know_your_progress : know_your_progress.src}
            alt="KnowYourProgressImage"
            className="object-contain -mr-32 "
          />
          <img
            src={typeof compare_with_others === 'string' ? compare_with_others : compare_with_others.src}
            alt="CompareWithOthersImage"
            className="object-contain"
          />
          <img
            src={typeof plan_your_lesson === 'string' ? plan_your_lesson : plan_your_lesson.src}
            alt="PlanYourLessonImage"
            className="object-contain -ml-36"
          />
        </div>

        <div className="w-fit">
          <CTAButton active={true} linkto={"/signup"}>
            <div>Learn more</div>
          </CTAButton>
        </div>
      </div>
    </div>
  )
}

export default LearningLanguageSection
