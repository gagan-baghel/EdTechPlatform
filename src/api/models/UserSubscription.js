const mongoose = require("mongoose")

const userSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
    razorpaySubscriptionId: { type: String, required: true, unique: true },
    status: { type: String, enum: ["created", "active", "cancelled"], default: "created" },
  },
  { timestamps: true }
)

module.exports =
  mongoose.models.UserSubscription || mongoose.model("UserSubscription", userSubscriptionSchema)
