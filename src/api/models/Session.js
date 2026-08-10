const mongoose = require("mongoose")

/**
 * Server-side session record backing JWT revocation. The JWT itself stays
 * stateless (still verified by signature+expiry first), but every request
 * additionally checks the corresponding Session doc hasn't been revoked —
 * this is what makes "log out everywhere" and "revoke this session"
 * actually work, and what makes a stolen token stop working the moment
 * it's revoked instead of staying valid for its full 24h lifetime.
 */
const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    jti: { type: String, required: true, unique: true },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    lastSeenAt: { type: Date, default: Date.now },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
)

module.exports = mongoose.models.Session || mongoose.model("Session", sessionSchema)
