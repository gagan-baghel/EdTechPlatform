const mongoose = require("mongoose")

/**
 * Timestamped personal notes AND bookmarks are the same shape — a
 * bookmark is just a note with empty text, marking a position worth
 * jumping back to. Splitting them into two models/endpoints for that
 * difference isn't worth the duplication.
 */
const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    subSection: { type: mongoose.Schema.Types.ObjectId, ref: "SubSection", required: true },
    timestampSeconds: { type: Number, required: true, min: 0 },
    text: { type: String, default: "" },
  },
  { timestamps: true }
)

noteSchema.index({ user: 1, course: 1 })

module.exports = mongoose.models.Note || mongoose.model("Note", noteSchema)
