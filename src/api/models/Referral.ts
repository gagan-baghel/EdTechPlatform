import { Schema } from "mongoose"

import type { Referral as ReferralEntity } from "@/types/domain"
import { REFERRAL_STATUS_VALUES } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

const referralSchema = new Schema<SchemaOf<ReferralEntity<ObjectId>>>(
  {
    referrer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    referredUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true },
    commissionAmountRupees: { type: Number, required: true },
    status: { type: String, enum: REFERRAL_STATUS_VALUES, default: "pending" },
  },
  { timestamps: true }
)

referralSchema.index({ referrer: 1, orderId: 1 }, { unique: true })
export const Referral = defineModel("Referral", referralSchema)
export default Referral