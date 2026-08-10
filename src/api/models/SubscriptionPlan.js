const mongoose = require("mongoose")

const subscriptionPlanSchema = new mongoose.Schema(
  {
    razorpayPlanId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    priceRupees: { type: Number, required: true },
    interval: { type: String, enum: ["monthly", "yearly"], required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

module.exports = mongoose.models.SubscriptionPlan || mongoose.model("SubscriptionPlan", subscriptionPlanSchema)
