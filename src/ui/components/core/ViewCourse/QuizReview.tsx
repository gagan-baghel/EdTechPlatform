import { VscCheck, VscClose } from "react-icons/vsc"

import { cn } from "../../../lib/cn"

/** One graded question, as the API returns it once the review has unlocked. */
export interface ReviewItem {
  questionId: string
  questionText: string
  options: string[]
  selectedOptionIndex: number | null
  correctOptionIndex: number
  correct: boolean
  explanation: string | null
}

/**
 * Question-by-question result: what you picked, what was right, and why.
 * Right/wrong carries an icon and a word, never colour alone.
 */
export default function QuizReview({ items }: { items: ReviewItem[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {items.map((item, i) => (
        <li key={item.questionId} className="rounded-md border border-richblack-700 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="font-medium text-richblack-5">
              {i + 1}. {item.questionText}
            </p>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                item.correct ? "bg-caribbeangreen-800 text-caribbeangreen-50" : "bg-pink-800 text-pink-50"
              )}
            >
              {item.correct ? <VscCheck aria-hidden /> : <VscClose aria-hidden />}
              {item.correct ? "Correct" : "Incorrect"}
            </span>
          </div>
          <ul className="flex flex-col gap-1.5 text-sm">
            {item.options.map((option, index) => {
              const isAnswer = index === item.correctOptionIndex
              const isPicked = index === item.selectedOptionIndex
              return (
                <li
                  key={index}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded px-3 py-1.5",
                    isAnswer ? "bg-caribbeangreen-100/15 text-richblack-5" : "text-richblack-200",
                    isPicked && !isAnswer && "bg-pink-200/15"
                  )}
                >
                  <span>{option}</span>
                  <span className="shrink-0 text-xs text-richblack-300">
                    {isAnswer && "Correct answer"}
                    {isAnswer && isPicked && " · "}
                    {isPicked && "Your answer"}
                  </span>
                </li>
              )
            })}
          </ul>
          {item.selectedOptionIndex === null && (
            <p className="mt-2 text-xs text-richblack-300">You didn&apos;t answer this one.</p>
          )}
          {item.explanation && (
            <p className="mt-3 border-l-2 border-richblack-600 pl-3 text-sm text-richblack-200">
              {item.explanation}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}
