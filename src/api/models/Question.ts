import { Schema } from "mongoose"

import type { Answer as AnswerEntity, Question as QuestionEntity } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

const answerSchema = new Schema<SchemaOf<AnswerEntity<ObjectId>>>(
  {
    answeredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
)

/**
 * Per-lecture Q&A (plan §4 student workspace / engagement). Answers are
 * embedded rather than a separate collection — a question with a handful
 * of answers is always read and written as one unit (load the thread,
 * post a reply), and there's no case here where an answer needs to be
 * queried independently of its question.
 */
const questionSchema = new Schema<SchemaOf<QuestionEntity<ObjectId>>>(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    subSection: { type: Schema.Types.ObjectId, ref: "SubSection", required: true, index: true },
    askedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    answers: [answerSchema],
  },
  { timestamps: true }
)
export const Question = defineModel("Question", questionSchema)
export default Question