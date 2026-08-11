import React from "react"
import HighlightText from "../../../components/core/HomePage/HighlightText"
import CTAButton from "../../../components/core/HomePage/Button"

interface LearningGridCard {
  order: number
  heading: string
  highlightText?: string
  description: string
  BtnText?: string
  BtnLink?: string
}

const LearningGridArray: LearningGridCard[] = [
  {
    order: -1,
    heading: "World-Class Learning for",
    highlightText: "Anyone, Anywhere",
    description:
      "IntelleCraft brings flexible, affordable, job-relevant online learning to individuals and organizations, taught by instructors working in the field.",
    BtnText: "Learn More",
    BtnLink: "/",
  },
  {
    order: 1,
    heading: "Curriculum Based on Industry Needs",
    description:
      "Save time and money! Every course is built to be easy to follow and aligned with what the industry actually asks for.",
  },
  {
    order: 2,
    heading: "Our Learning Methods",
    description:
      "Learn at your own pace with video lessons, hands-on practice, and progress tracking that picks up right where you left off.",
  },
  {
    order: 3,
    heading: "Certification",
    description:
      "Finish a course and walk away with proof of what you learned — something worth showing an employer.",
  },
  {
    order: 4,
    heading: `Rating "Auto-grading"`,
    description:
      "Get quick, consistent feedback on your progress so you always know where you stand.",
  },
  {
    order: 5,
    heading: "Ready to Work",
    description:
      "Every course is built around real, job-relevant skills — not just theory.",
  },
]

const LearningGrid: React.FC = () => {
  return (
    <div className="grid mx-auto w-[350px] xl:w-fit grid-cols-1 xl:grid-cols-4 mb-12">
      {LearningGridArray.map((card, i) => {
        return (
          <div
            key={i}
            className={`${i === 0 ? "xl:col-span-2 xl:h-[294px]" : ""}  ${
              card.order % 2 === 1
                ? "bg-richblack-700 h-[294px]"
                : card.order % 2 === 0
                ? "bg-richblack-800 h-[294px]"
                : "bg-transparent"
            } ${card.order === 3 ? "xl:col-start-2" : ""}  `}
          >
            {card.order < 0 ? (
              <div className="xl:w-[90%] flex flex-col gap-3 pb-10 xl:pb-0">
                <div className="text-4xl font-semibold ">
                  {card.heading}
                  {card.highlightText && <HighlightText text={card.highlightText} />}
                </div>
                <p className="text-richblack-300 font-medium">
                  {card.description}
                </p>

                <div className="w-fit mt-2">
                  <CTAButton active={true} linkto={card.BtnLink || "/"}>
                    {card.BtnText}
                  </CTAButton>
                </div>
              </div>
            ) : (
              <div className="p-8 flex flex-col gap-8">
                <h1 className="text-richblack-5 text-lg">{card.heading}</h1>

                <p className="text-richblack-300 font-medium">
                  {card.description}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default LearningGrid
