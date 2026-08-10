import { Schema } from "mongoose"

import type { AiInteraction as AiInteractionEntity } from "@/types/domain"
import { AI_INTERACTION_TYPE_VALUES } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

/**
 * AI audit log (plan §6 governance: "which model, which prompt version,
 * what was returned. Required to debug a wrong answer and to defend a
 * disputed assessment."). Every AI call in this app writes one of these,
 * win or lose — see aiRateLimitAndLog in utils/aiGovernance.js.
 */
const aiInteractionSchema = new Schema<SchemaOf<AiInteractionEntity<ObjectId>>>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: AI_INTERACTION_TYPE_VALUES, required: true },
    model: { type: String, required: true },
    promptVersion: { type: String, required: true },
    input: { type: String, required: true },
    output: { type: String, default: "" },
    subSection: { type: Schema.Types.ObjectId, ref: "SubSection", default: null },
    succeeded: { type: Boolean, required: true },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
)
export const AIInteraction = defineModel("AIInteraction", aiInteractionSchema)
export default AIInteraction