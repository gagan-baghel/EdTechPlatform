const mongoose = require("mongoose")

/**
 * Scheduling data model only — the actual video call happens on whatever
 * vendor the instructor already uses (Zoom/Meet/Teams), linked via
 * meetingUrl. Building real in-platform video streaming needs a vendor
 * integration (Zoom/Agora/Daily.co API key) that isn't something this
 * migration can provision — see the plan's own note on this. This is the
 * honest, no-new-dependency version: a calendar entry with a join link.
 */
const liveSessionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 60 },
    meetingUrl: { type: String, required: true },
    status: { type: String, enum: ["scheduled", "cancelled"], default: "scheduled" },
    // Posted after the session happens, using the SAME direct-to-Cloudinary
    // signed upload + verify-by-refetch pipeline lectures already use
    // (getVideoUploadSignature + verifyUploadedVideo in Subsection.js) —
    // no new video infrastructure, just the existing one applied here too.
    recordingVideoUrl: { type: String, default: null },
    recordingPublicId: { type: String, default: null },
  },
  { timestamps: true }
)

module.exports = mongoose.models.LiveSession || mongoose.model("LiveSession", liveSessionSchema)
