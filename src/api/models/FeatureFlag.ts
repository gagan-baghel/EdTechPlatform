import { Schema } from "mongoose"

import type { FeatureFlag as FeatureFlagEntity } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

/**
 * "A flag table plus a typed accessor is enough — do not adopt a vendor
 * for this yet." One document per flag, keyed by a stable string key.
 * enabled is a global on/off; roles lets a flag be restricted to specific
 * account types (e.g. an AI feature gated to Instructor while in beta)
 * without needing a per-user rollout mechanism this app has no scale to
 * justify yet.
 */
const featureFlagSchema = new Schema<SchemaOf<FeatureFlagEntity<ObjectId>>>({
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
export const FeatureFlag = defineModel("FeatureFlag", featureFlagSchema)
export default FeatureFlag