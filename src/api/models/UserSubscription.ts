import { Schema } from "mongoose"

import type { UserSubscription as UserSubscriptionEntity } from "@/types/domain"
import { SUBSCRIPTION_STATUS_VALUES } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

const userSubscriptionSchema = new Schema<SchemaOf<UserSubscriptionEntity<ObjectId>>>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
    razorpaySubscriptionId: { type: String, required: true, unique: true },
    status: { type: String, enum: SUBSCRIPTION_STATUS_VALUES, default: "created" },
  },
  { timestamps: true }
)
export const UserSubscription = defineModel("UserSubscription", userSubscriptionSchema)
export default UserSubscription