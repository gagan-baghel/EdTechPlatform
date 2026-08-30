import { Schema } from "mongoose"

import type { User as UserEntity } from "@/types/domain"
import { ACCOUNT_TYPE_VALUES } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

/**
 * `notificationEmailPreferences` is the one field whose stored type differs
 * from its JSON type — a Mongoose Map here, a plain object once serialised.
 */
export type UserSchemaShape = Omit<
  SchemaOf<UserEntity<ObjectId>>,
  "notificationEmailPreferences"
> & {
  notificationEmailPreferences: Map<string, boolean>
}

const userSchema = new Schema<UserSchemaShape>({
    firstName:{
        type:String,
        required:true,
        trim:true
    },
    lastName:{
        type:String,
        required:true,
        trim:true
    },
    email:{
        type:String,
        required:true,
        trim:true,
        // The unique index below is byte-exact, so without this
        // "A@x.com" and "a@x.com" are two accounts that both believe they
        // own the same address — and the owner of the second one can never
        // log in as the first. Normalised here as well as at the request
        // boundary (lib/schemas.ts `email()`) so a write from anywhere in
        // the codebase lands in the same shape.
        lowercase:true,
        // Declared here for a fresh environment; on an existing database
        // this index must be created by scripts/ensure-indexes.js AFTER it
        // has deduped any existing collisions — autoIndex is off (see
        // connectDB.ts) specifically so this declaration alone can't try to
        // build the index against unresolved duplicates and crash a cold start.
        unique:true,
    },
    password:{
        type:String,
        required:true,
        // Excluded by default so any populate/find that forgets to scope its
        // projection can't leak the hash. Reads that need it must opt in
        // with .select("+password") — currently only login and changePassword.
        select:false,
    },
    active: {
        type: Boolean,
        default: true,
    },
    accountType:{
        type:String,
        enum:ACCOUNT_TYPE_VALUES,
        required:true
    },
    token:{
        // A live password-reset token. Excluded by default for the same
        // reason as password — nothing currently reads this field back
        // (resetPassword queries BY token, which is a filter, not affected
        // by select:false), so there is no read site to update.
        type:String,
        select:false,
    },
    resetPasswordExpires:{
        type:Date
    },
    additionalDetails:{
        type:Schema.Types.ObjectId,
        required:true,
        ref:"Profile"
    },
    approved: {
        type: Boolean,
        default: true,
    },
    courses:[{
        type:Schema.Types.ObjectId,
        ref:"Course"
    }],
    userImage:{
        type:String,
        required: true,
    },
    courseProgress:[{
        type:Schema.Types.ObjectId,
        ref:"CourseProgress"
    }],
    // Wishlist — student workspace (P2). A saved course is not an
    // enrollment and grants no access; it's purely "I want to come back
    // to this."
    savedCourses:[{
        type:Schema.Types.ObjectId,
        ref:"Course"
    }],
    // Per-event-type email opt-out. Absent/true = email sent; explicit
    // false = suppressed. Modeled as opt-out rather than opt-in so a user
    // who never visits settings still gets enrollment/payment emails,
    // which are closer to transactional than marketing.
    notificationEmailPreferences: {
        type: Map,
        of: Boolean,
        default: {},
    },
    // Gates the /onboarding redirect — false until the first-run flow is
    // completed or explicitly skipped, so it fires exactly once per account.
    onboarded: {
        type: Boolean,
        default: false,
    },
    // Affiliate program (P3). referralCode is generated lazily on first
    // request rather than at signup — most users never become affiliates,
    // so minting a code for every account would be pure waste.
    referralCode: {
        type: String,
        // NO `default: null`. A sparse unique index only skips documents where
        // the field is ABSENT — a field that is present and null still
        // participates, so with a default of null exactly one user in the
        // entire database could exist without a referral code and the second
        // signup died on a duplicate-key error. The field now genuinely does
        // not exist until Affiliate.getMyReferralCode mints one, which is what
        // makes `sparse` do the job it was chosen for.
        //
        // This never fired in production only because autoIndex is off and the
        // index was never built — a latent landmine that any syncIndexes()
        // would have set off. scripts/ensure-indexes.ts now builds it, after
        // clearing the stored nulls.
        unique: true,
        sparse: true,
    },
    referredBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
    }
})

export const User = defineModel("User", userSchema)
export default User
