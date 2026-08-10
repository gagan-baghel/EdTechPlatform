const mongoose = require("mongoose")

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["percent", "flat"], required: true },
    // percent: 0-100. flat: rupees, capped at the order total so a coupon
    // can never make totalAmount negative — enforced in validateCoupon,
    // not here, since it depends on the order it's being applied to.
    value: { type: Number, required: true, min: 0 },
    // null = platform-wide. Set = only applies to that one course.
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },
    maxUses: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
)

module.exports = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema)
