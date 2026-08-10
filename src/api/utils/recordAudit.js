const AuditLog = require("../models/AuditLog")

/**
 * Call AFTER a privileged mutation has already succeeded — never let audit
 * logging block or fail the action it's recording. Errors are logged
 * loudly (not swallowed like emitEvent's) because a missing audit row for
 * a real admin action (a refund, a takedown, a ban) is itself the kind of
 * gap this exists to prevent.
 */
async function recordAudit({ actor, action, targetType, targetId, details = {} }) {
  try {
    await AuditLog.create({ actor, action, targetType, targetId, details })
  } catch (error) {
    console.error("recordAudit failed — audit trail has a gap", action, error)
  }
}

module.exports = { recordAudit }
