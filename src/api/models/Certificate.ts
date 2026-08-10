import crypto from "crypto"
import { Schema, type Model } from "mongoose"

import type { Certificate as CertificateEntity } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

type CertificateSchema = SchemaOf<CertificateEntity<ObjectId>>

/** Statics have to be declared on the model type or callers see `any`. */
interface CertificateModel extends Model<CertificateSchema> {
  generateCertificateNumber(): string
}

const certificateSchema = new Schema<CertificateSchema, CertificateModel>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    // Short, unguessable, and distinct from the Mongo _id — a certificate
    // number is meant to be typed/read aloud for verification, and using
    // the raw ObjectId would expose a document id in a public URL for no
    // reason.
    certificateNumber: { type: String, required: true, unique: true },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

certificateSchema.index({ user: 1, course: 1 }, { unique: true })

certificateSchema.statics.generateCertificateNumber = function () {
  return `IC-${crypto.randomBytes(6).toString("hex").toUpperCase()}`
}
export const Certificate = defineModel<CertificateSchema, CertificateModel>(
  "Certificate",
  certificateSchema
)
export default Certificate