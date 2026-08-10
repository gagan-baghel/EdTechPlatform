const mongoose = require('mongoose')

const profileSchema = new  mongoose.Schema({
    gender:{
        type:String,
    },
    dateOfBirth:{
        type:String,
    },
    about:{
        type:String,
        trim:true,
    },
    contactNumber:{
        type:Number,
        trim:true,
    },
    // Collected once, in onboarding — feeds both personalization and the
    // outcome-accountability thesis (plan §1): what a student is here for
    // is the basis for judging whether the platform delivered it.
    learningGoal:{
        type:String,
        enum: ["career_switch", "skill_upgrade", "certification", "hobby", null],
        default: null,
    },
    weeklyGoalMinutes: {
        type: Number,
        default: 0,
    },
    // Playback preferences — applied client-side by VideoDetails.jsx.
    defaultPlaybackSpeed: {
        type: Number,
        default: 1,
    },
    autoplayNext: {
        type: Boolean,
        default: true,
    },
    // Appearance & language (Settings). theme/locale are also mirrored to
    // localStorage for instant client-side effect (ThemeProvider.jsx,
    // LocaleProvider.jsx) — stored here too so they follow the user across
    // devices instead of resetting on a fresh browser.
    theme: {
        type: String,
        enum: ["dark", "light"],
        default: "dark",
    },
    locale: {
        type: String,
        enum: ["en", "hi"],
        default: "en",
    },
    // IANA zone name (e.g. "Asia/Kolkata"). Used by formatDate.js wherever
    // a component passes it through, instead of the viewer's local
    // browser zone — matters for anything read across devices/timezones,
    // like an instructor scheduling a live session for students elsewhere.
    timezone: {
        type: String,
        default: null,
    }

})


module.exports = mongoose.models.Profile || mongoose.model("Profile",profileSchema)
