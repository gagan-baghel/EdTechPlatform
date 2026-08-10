const mongoose = require("mongoose")

/**
 * Bank/KYC details required before an instructor can be paid out. This is
 * intentionally minimal — the true-marketplace decision means real money
 * needs to move to real bank accounts, which needs this to exist at all
 * (today's codebase has no concept of an instructor being owed money
 * beyond a display number computed from enrolled × current price).
 *
 * SECURITY NOTE, read before storing real data here: bankAccountNumber is
 * stored in plaintext. That is NOT acceptable for production with real
 * bank details — it needs field-level encryption (e.g. via a KMS-backed
 * encrypt/decrypt helper) before this collection holds anything real.
 * That decision (which KMS, which encryption library) is an infrastructure
 * choice for whoever operates this, not something to invent unilaterally
 * here. Every read path in Payout.js masks the number to its last 4 digits
 * specifically because the plaintext storage this masking sits in front of
 * is not yet acceptable on its own.
 */
const instructorPayoutProfileSchema = new mongoose.Schema(
  {
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    bankAccountHolderName: { type: String, required: true },
    bankAccountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },
    // India-specific tax id (PAN) — this app is INR/Razorpay-only today.
    // A platform expanding beyond India needs a different/additional field
    // here, not a rename of this one.
    panNumber: { type: String, required: true },
    kycStatus: {
      type: String,
      enum: ["not_submitted", "pending", "verified", "rejected"],
      default: "pending",
    },
    kycRejectionReason: { type: String },
    // Platform's cut. Per-instructor so a negotiated rate is possible
    // without a schema change; falls back to the platform default when unset.
    platformFeePercent: { type: Number, default: 30, min: 0, max: 100 },
  },
  { timestamps: true }
)

module.exports =
  mongoose.models.InstructorPayoutProfile ||
  mongoose.model("InstructorPayoutProfile", instructorPayoutProfileSchema)
