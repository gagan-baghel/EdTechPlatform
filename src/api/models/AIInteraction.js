const mongoose = require("mongoose")

/**
 * AI audit log (plan §6 governance: "which model, which prompt version,
 * what was returned. Required to debug a wrong answer and to defend a
 * disputed assessment."). Every AI call in this app writes one of these,
 * win or lose — see aiRateLimitAndLog in utils/aiGovernance.js.
 */
const aiInteractionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["tutor", "copilot_outline", "quiz_generation"], required: true },
    model: { type: String, required: true },
    promptVersion: { type: String, required: true },
    input: { type: String, required: true },
    output: { type: String, default: "" },
    subSection: { type: mongoose.Schema.Types.ObjectId, ref: "SubSection", default: null },
    succeeded: { type: Boolean, required: true },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
)

module.exports = mongoose.models.AIInteraction || mongoose.model("AIInteraction", aiInteractionSchema)
