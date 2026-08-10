import { Schema } from "mongoose"

import type { QuizAttempt as QuizAttemptEntity } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

const quizAttemptSchema = new Schema<SchemaOf<QuizAttemptEntity<ObjectId>>>(
  {
    quiz: { type: Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    answers: [
      {
        questionId: { type: Schema.Types.ObjectId, required: true },
        selectedOptionIndex: { type: Number, required: true },
      },
    ],
    scorePercent: { type: Number, required: true },
    passed: { type: Boolean, required: true },
  },
  { timestamps: true }
)
export const QuizAttempt = defineModel("QuizAttempt", quizAttemptSchema)
export default QuizAttempt