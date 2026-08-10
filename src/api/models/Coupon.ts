import { Schema } from "mongoose"

import type { Coupon as CouponEntity } from "@/types/domain"
import { COUPON_TYPE_VALUES } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

const couponSchema = new Schema<SchemaOf<CouponEntity<ObjectId>>>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: COUPON_TYPE_VALUES, required: true },
    // percent: 0-100. flat: rupees, capped at the order total so a coupon
    // can never make totalAmount negative — enforced in validateCoupon,
    // not here, since it depends on the order it's being applied to.
    value: { type: Number, required: true, min: 0 },
    // null = platform-wide. Set = only applies to that one course.
    course: { type: Schema.Types.ObjectId, ref: "Course", default: null },
    maxUses: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
)
export const Coupon = defineModel("Coupon", couponSchema)
export default Coupon