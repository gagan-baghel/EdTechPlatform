const mongoose = require("mongoose")

/**
 * One record per payout run for one instructor over one period. Generated
 * from real Payment rows (see Payments.generatePayoutRun) — never from
 * enrolled-count × current-price, which is wrong the moment a price
 * changes and ignores refunds entirely.
 *
 * Execution boundary: this app has no live integration with a payout rail
 * (Razorpay Route / RazorpayX or equivalent) — wiring one requires business
 * KYC with that processor, done by whoever operates this platform, not
 * something achievable from code alone. So "paid" here means an admin
 * executed the transfer through whatever channel they actually have
 * (Razorpay Route once set up, a manual bank transfer today) and recorded
 * it — this collection is the ledger and audit trail, not the payment rail.
 */
const payoutSchema = new mongoose.Schema(
  {
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    // The exact Payment rows this payout covers — the mechanism that
    // guarantees a payment is never counted in two payout runs.
    payments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
      },
    ],
    grossAmount: { type: Number, required: true },
    platformFeeAmount: { type: Number, required: true },
    netAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },
    paidAt: { type: Date },
    // Set by the admin once the transfer has actually been executed
    // through whatever channel was used — a bank reference number, a
    // Razorpay Route transfer id, etc. Free text deliberately: the shape
    // of "proof this happened" varies by channel and isn't this app's to
    // dictate.
    transactionReference: { type: String },
  },
  { timestamps: true }
)

module.exports = mongoose.models.Payout || mongoose.model("Payout", payoutSchema)
