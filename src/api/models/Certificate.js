const mongoose = require("mongoose")
const crypto = require("crypto")

const certificateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    // Short, unguessable, and distinct from the Mongo _id — a certificate
    // number is meant to be typed/read aloud for verification, and using
    // the raw ObjectId would expose a document id in a public URL for no
    // reason.
    certificateNumber: { type: String, required: true, unique: true },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

certificateSchema.index({ user: 1, course: 1 }, { unique: true })

certificateSchema.statics.generateCertificateNumber = function () {
  return `IC-${crypto.randomBytes(6).toString("hex").toUpperCase()}`
}

module.exports = mongoose.models.Certificate || mongoose.model("Certificate", certificateSchema)
