import { Schema } from "mongoose"

import type { Session as SessionEntity } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

/**
 * Server-side session record backing JWT revocation. The JWT itself stays
 * stateless (still verified by signature+expiry first), but every request
 * additionally checks the corresponding Session doc hasn't been revoked —
 * this is what makes "log out everywhere" and "revoke this session"
 * actually work, and what makes a stolen token stop working the moment
 * it's revoked instead of staying valid for its full 24h lifetime.
 */
const sessionSchema = new Schema<SchemaOf<SessionEntity<ObjectId>>>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    jti: { type: String, required: true, unique: true },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    lastSeenAt: { type: Date, default: Date.now },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
)

/**
 * A session record is only useful while the JWT it revokes could still be
 * presented, and that is capped at the 24h token lifetime (see Auth.ts).
 * Without this the collection grew by one document per login forever, and
 * "your active devices" in Settings listed every browser the user had ever
 * signed in from. 48h rather than 24h so a session is never swept while its
 * token is still valid, even with clock skew.
 *
 * autoIndex is off (connectDB.ts) — scripts/ensure-indexes.ts is what
 * actually creates this in a deployed environment.
 */
sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 48 * 60 * 60 })

export const Session = defineModel("Session", sessionSchema)
export default Session
