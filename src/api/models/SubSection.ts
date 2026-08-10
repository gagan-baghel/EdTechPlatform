import { Schema } from "mongoose"

import type { SubSection as SubSectionEntity } from "@/types/domain"
import { TRANSCRIPT_STATUS_VALUES } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

const subSectionSchema = new Schema<SchemaOf<SubSectionEntity<ObjectId>>>({
    title:{
        type:String,
    },
    timeDuration:{
        type:String
    },
    description:{
        type:String
    },
    videoUrl:{
        type:String
    },
    order: {
        type: Number,
        default: 0,
    },
    freePreview: {
        type: Boolean,
        default: false,
    },
    attachments: [
        {
            name: { type: String, required: true },
            url: { type: String, required: true },
            publicId: { type: String, required: true },
        },
    ],
    transcript: {
        type: String,
        default: "",
    },
    transcriptStatus: {
        type: String,
        enum: TRANSCRIPT_STATUS_VALUES,
        default: "none",
    },
})

export const SubSection = defineModel("SubSection", subSectionSchema)
export default SubSection
