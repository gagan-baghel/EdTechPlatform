import { Schema } from "mongoose"

import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"
import type { InstructorPayoutProfile as PayoutProfileEntity } from "@/types/domain"
import { decrypt, encrypt } from "../lib/crypto"

/**
 * Bank/KYC details required before an instructor can be paid out.
 *
 * `bankAccountNumber` is encrypted at rest with AES-256-GCM (see
 * lib/crypto.ts); the schema setter/getter is what makes that automatic for
 * every write and read rather than something each call site has to remember.
 *
 * IMPORTANT for readers: the getter does NOT run under `.lean()`, which is how
 * every list endpoint reads. `Payout.ts` therefore decrypts explicitly via
 * `revealAccountNumber` before masking — masking the ciphertext would show the
 * instructor four characters of hex and quietly look correct.
 */
const instructorPayoutProfileSchema = new Schema<
  SchemaOf<PayoutProfileEntity<ObjectId>>
>(
  {
    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    bankAccountHolderName: { type: String, required: true },
    bankAccountNumber: {
      type: String,
      required: true,
      set: encrypt,
      get: decrypt,
    },
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
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
)

export const InstructorPayoutProfile = defineModel(
  "InstructorPayoutProfile",
  instructorPayoutProfileSchema
)
export default InstructorPayoutProfile
