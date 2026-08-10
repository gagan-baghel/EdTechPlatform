import { Schema } from "mongoose"

import type { SubscriptionPlan as SubscriptionPlanEntity } from "@/types/domain"
import { SUBSCRIPTION_INTERVAL_VALUES } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

const subscriptionPlanSchema = new Schema<SchemaOf<SubscriptionPlanEntity<ObjectId>>>(
  {
    razorpayPlanId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    priceRupees: { type: Number, required: true },
    interval: { type: String, enum: SUBSCRIPTION_INTERVAL_VALUES, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)
export const SubscriptionPlan = defineModel("SubscriptionPlan", subscriptionPlanSchema)
export default SubscriptionPlan