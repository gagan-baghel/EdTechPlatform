import { Schema } from "mongoose"

import type { Note as NoteEntity } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

/**
 * Timestamped personal notes AND bookmarks are the same shape — a
 * bookmark is just a note with empty text, marking a position worth
 * jumping back to. Splitting them into two models/endpoints for that
 * difference isn't worth the duplication.
 */
const noteSchema = new Schema<SchemaOf<NoteEntity<ObjectId>>>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    subSection: { type: Schema.Types.ObjectId, ref: "SubSection", required: true },
    timestampSeconds: { type: Number, required: true, min: 0 },
    text: { type: String, default: "" },
  },
  { timestamps: true }
)

noteSchema.index({ user: 1, course: 1 })
export const Note = defineModel("Note", noteSchema)
export default Note