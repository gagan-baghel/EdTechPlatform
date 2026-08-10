const mongoose = require("mongoose")

/**
 * "A flag table plus a typed accessor is enough — do not adopt a vendor
 * for this yet." One document per flag, keyed by a stable string key.
 * enabled is a global on/off; roles lets a flag be restricted to specific
 * account types (e.g. an AI feature gated to Instructor while in beta)
 * without needing a per-user rollout mechanism this app has no scale to
 * justify yet.
 */
const featureFlagSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  enabled: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
  },
  // Empty array = no role restriction beyond the enabled toggle.
  roles: {
    type: [String],
    default: [],
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.models.FeatureFlag || mongoose.model("FeatureFlag", featureFlagSchema)
