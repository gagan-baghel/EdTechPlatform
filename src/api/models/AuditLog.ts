import { Schema } from "mongoose"

import type { AuditLog as AuditLogEntity } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

/**
 * "Who changed this price / issued this refund / published this course" is
 * unanswerable retroactively — this exists for the same reason Event.js
 * does: it's cheap now and impossible to backfill later. Unlike Event
 * (product analytics, best-effort), audit entries are written by
 * recordAudit's caller AFTER the privileged mutation already succeeded, so
 * a logging failure here never blocks the action, but IS surfaced (not
 * swallowed) since a missing audit entry for a real admin action is itself
 * a problem worth knowing about.
 */
const auditLogSchema = new Schema<SchemaOf<AuditLogEntity<ObjectId>>>({
  actor: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  targetType: {
    type: String,
  },
  targetId: {
    type: Schema.Types.Mixed,
  },
  details: {
    type: Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
})
export const AuditLog = defineModel("AuditLog", auditLogSchema)
export default AuditLog