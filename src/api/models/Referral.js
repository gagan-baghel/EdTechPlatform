const mongoose = require("mongoose")

const referralSchema = new mongoose.Schema(
  {
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    referredUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true },
    commissionAmountRupees: { type: Number, required: true },
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
  },
  { timestamps: true }
)

referralSchema.index({ referrer: 1, orderId: 1 }, { unique: true })

module.exports = mongoose.models.Referral || mongoose.model("Referral", referralSchema)
