const mongoose = require("mongoose")

const answerSchema = new mongoose.Schema(
  {
    answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
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
const questionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    subSection: { type: mongoose.Schema.Types.ObjectId, ref: "SubSection", required: true, index: true },
    askedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    answers: [answerSchema],
  },
  { timestamps: true }
)

module.exports = mongoose.models.Question || mongoose.model("Question", questionSchema)
