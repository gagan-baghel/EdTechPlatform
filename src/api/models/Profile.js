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
    }

})


module.exports = mongoose.models.Profile || mongoose.model("Profile",profileSchema)
