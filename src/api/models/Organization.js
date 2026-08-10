const mongoose = require("mongoose")
const crypto = require("crypto")

/**
 * B2B seats (plan §3/P3) — an org owner buys N seats for a course, and
 * anyone with the invite code who joins consumes one seat and is enrolled.
 * courses is an array rather than a single course so one org can bundle
 * seats across several courses under one invite code.
 */
const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    inviteCode: { type: String, required: true, unique: true },
    courses: [
      {
        course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
        seatsTotal: { type: Number, required: true, min: 1 },
        seatsUsed: { type: Number, default: 0 },
      },
    ],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
)

organizationSchema.statics.generateInviteCode = function () {
  return crypto.randomBytes(6).toString("hex").toUpperCase()
}

module.exports = mongoose.models.Organization || mongoose.model("Organization", organizationSchema)
