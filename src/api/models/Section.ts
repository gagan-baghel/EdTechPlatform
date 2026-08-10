import { Schema } from "mongoose"

import type { Section as SectionEntity } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

const sectionSchema = new Schema<SchemaOf<SectionEntity<ObjectId>>>({
    sectionName:{
        type:String,
    },
    subSection:[{
        type:Schema.Types.ObjectId,
        required:true,
        ref:"SubSection"
    }],
    order: {
        type: Number,
        default: 0,
    },
})

sectionSchema.index({ order: 1 })

export const Section = defineModel("Section", sectionSchema)
export default Section
