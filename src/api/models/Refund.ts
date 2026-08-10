import { Schema } from "mongoose"

import type { Refund as RefundEntity } from "@/types/domain"
import { REFUND_REASON_VALUES, REFUND_STATUS_VALUES } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

/**
 * One record per refund actually issued. Refunds always go through
 * Razorpay's real refund API (instance.payments.refund) — unlike payouts,
 * this needs no marketplace/Route KYC, since it's refunding money the
 * platform's own merchant account already received. Execution stays
 * admin-triggered even under the outcome-accountability policy: the
 * policy (see checkRefundEligibility in Refund.js controller) decides who
 * is OWED a refund, but reversing a real payment automatically was
 * explicitly ruled out in the P0 audit ("wrongly revoking a paying
 * customer's access is worse than current silence") — the same caution
 * applies in the other direction: auto-issuing a refund with no human
 * check is the kind of automation that's riskier than the problem it solves.
 */
const refundSchema = new Schema<SchemaOf<RefundEntity<ObjectId>>>(
  {
    payment: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
    amount: { type: Number, required: true },
    reason: {
      type: String,
      enum: REFUND_REASON_VALUES,
      required: true,
    },
    notes: { type: String },
    razorpayRefundId: { type: String },
    status: {
      type: String,
      enum: REFUND_STATUS_VALUES,
      required: true,
    },
    initiatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
)
export const Refund = defineModel("Refund", refundSchema)
export default Refund