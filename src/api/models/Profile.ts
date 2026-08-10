import { Schema } from "mongoose"

import type { Profile as ProfileEntity } from "@/types/domain"
import { LEARNING_GOAL_VALUES, LOCALE_VALUES, THEME_VALUES } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

const profileSchema = new Schema<SchemaOf<ProfileEntity<ObjectId>>>({
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
    learningGoal:{
        type:String,
        // `null` stays in the enum: the field defaults to null and Mongoose
        // validates defaults, so dropping it would reject every new profile.
        enum: [...LEARNING_GOAL_VALUES, null],
        default: null,
    },
    weeklyGoalMinutes: {
        type: Number,
        default: 0,
    },
    defaultPlaybackSpeed: {
        type: Number,
        default: 1,
    },
    autoplayNext: {
        type: Boolean,
        default: true,
    },
    theme: {
        type: String,
        enum: THEME_VALUES,
        default: "dark",
    },
    locale: {
        type: String,
        enum: LOCALE_VALUES,
        default: "en",
    },
    timezone: {
        type: String,
        default: null,
    }
})

export const Profile = defineModel("Profile", profileSchema)
export default Profile
