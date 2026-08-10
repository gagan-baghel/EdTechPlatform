const mongoose = require('mongoose')

const userSchema = new  mongoose.Schema({
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
        // Declared here for a fresh environment; on an existing database
        // this index must be created by scripts/ensure-indexes.js AFTER it
        // has deduped any existing collisions — autoIndex is off (see
        // connectDB.js) specifically so this declaration alone can't try to
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
        enum:["Admin","Student","Instructor"],
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
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"Profile"
    },
    approved: {
        type: Boolean,
        default: true,
    },
    courses:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Course"
    }],
    userImage:{
        type:String,
        required: true,
    },
    courseProgress:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"CourseProgress"
    }],
    // Wishlist — student workspace (P2). A saved course is not an
    // enrollment and grants no access; it's purely "I want to come back
    // to this."
    savedCourses:[{
        type:mongoose.Schema.Types.ObjectId,
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
        default: null,
        unique: true,
        sparse: true,
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    }


})


module.exports = mongoose.models.User || mongoose.model("User",userSchema)
