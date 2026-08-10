const mongoose = require("mongoose")

const courseProgress = new mongoose.Schema({
  courseID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  completedVideos: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubSection",
    },
  ],
  // Progress v2: per-lecture watch position, not just a done/not-done flag.
  // Previously the only signal was completedVideos, written by a manual
  // "Mark As Completed" button reachable only after the video ended —
  // watch 95% and close the tab, and there was no record of it at all.
  watchState: [
    {
      subSection: { type: mongoose.Schema.Types.ObjectId, ref: "SubSection" },
      positionSeconds: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  // The lecture to resume into — updated on every watch-position heartbeat,
  // read by EnrolledCourses/"Continue learning" instead of always opening
  // courseContent[0].subSection[0].
  lastWatchedSubSection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubSection",
    default: null,
  },
}, {
  // createdAt approximates enrollment date — this doc is created exactly
  // once, at enrollment time, in enrollStudents (Payments.js). The
  // completion-linked refund policy (Refund.js) reads it to compute "days
  // since enrollment" against the refund-eligibility deadline.
  timestamps: true,
})

// Payments.js upserts on this exact pair — without a unique index backing
// it, that upsert is not race-safe. See scripts/ensure-indexes.js;
// autoIndex is off (connectDB.js).
courseProgress.index({ courseID: 1, userId: 1 }, { unique: true })

module.exports =
  mongoose.models.CourseProgress ||
  mongoose.model("CourseProgress", courseProgress)
