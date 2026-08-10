const mongoose = require('mongoose')

const sectionSchema = new  mongoose.Schema({
    sectionName:{
        type:String,
    },
    subSection:[{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"SubSection"
    }],
    // Ordering was previously array position only — not a value that can be
    // read, sorted on, or changed independently of a full array rewrite.
    // Explicit so drag-to-reorder can persist a position without touching
    // every other section's document.
    order: {
        type: Number,
        default: 0,
    },

})

sectionSchema.index({ order: 1 })

module.exports = mongoose.models.Section || mongoose.model("Section",sectionSchema)
