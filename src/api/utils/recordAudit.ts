import type { Types } from "mongoose"

import AuditLog from "../models/AuditLog"

export interface AuditEntry {
  actor: Types.ObjectId | string
  action: string
  targetType?: string
  targetId?: unknown
  details?: Record<string, unknown>
}

/**
 * Call AFTER a privileged mutation has already succeeded — never let audit
 * logging block or fail the action it's recording. Errors are logged
 * loudly (not swallowed like emitEvent's) because a missing audit row for
 * a real admin action (a refund, a takedown, a ban) is itself the kind of
 * gap this exists to prevent.
 */
export async function recordAudit({
  actor,
  action,
  targetType,
  targetId,
  details = {},
}: AuditEntry): Promise<void> {
  try {
    await AuditLog.create({ actor, action, targetType, targetId, details })
  } catch (error) {
    console.error("recordAudit failed — audit trail has a gap", action, error)
  }
}
