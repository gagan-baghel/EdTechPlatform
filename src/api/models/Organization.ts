import crypto from "crypto"
import { Schema, type Model } from "mongoose"

import type { Organization as OrganizationEntity } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

type OrganizationSchema = SchemaOf<OrganizationEntity<ObjectId>>

interface OrganizationModel extends Model<OrganizationSchema> {
  generateInviteCode(): string
}

/**
 * B2B seats (plan §3/P3) — an org owner buys N seats for a course, and
 * anyone with the invite code who joins consumes one seat and is enrolled.
 * courses is an array rather than a single course so one org can bundle
 * seats across several courses under one invite code.
 */
const organizationSchema = new Schema<OrganizationSchema, OrganizationModel>(
  {
    name: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    inviteCode: { type: String, required: true, unique: true },
    courses: [
      {
        course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
        seatsTotal: { type: Number, required: true, min: 1 },
        seatsUsed: { type: Number, default: 0 },
      },
    ],
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
)

organizationSchema.statics.generateInviteCode = function () {
  return crypto.randomBytes(6).toString("hex").toUpperCase()
}
export const Organization = defineModel<OrganizationSchema, OrganizationModel>(
  "Organization",
  organizationSchema
)
export default Organization