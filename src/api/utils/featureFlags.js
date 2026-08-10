const FeatureFlag = require("../models/FeatureFlag")

/**
 * Typed accessor so call sites never touch the FeatureFlag model directly.
 * Fails open to `false` on any DB error — a flag-check outage must degrade
 * to "feature off," never crash the request that was checking it.
 *
 * @param {string} key
 * @param {{accountType?: string}} [user] - pass the caller's user doc/claims
 *   to evaluate role-restricted flags; omit for a global-only check.
 */
async function isFeatureEnabled(key, user) {
  try {
    const flag = await FeatureFlag.findOne({ key }).lean()
    if (!flag || !flag.enabled) return false
    if (flag.roles?.length && (!user || !flag.roles.includes(user.accountType))) {
      return false
    }
    return true
  } catch (error) {
    console.error("isFeatureEnabled failed, defaulting to disabled", key, error)
    return false
  }
}

module.exports = { isFeatureEnabled }
