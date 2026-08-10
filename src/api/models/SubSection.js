const mongoose = require('mongoose')

const subSectionSchema = new  mongoose.Schema({
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
    // Same rationale as Section.order — lets a lecture be repositioned
    // without rewriting the whole containing array.
    order: {
        type: Number,
        default: 0,
    },
    // Lets a course offer a sample lecture before purchase. Previously the
    // only "preview" available to a non-buyer was the course thumbnail —
    // this is a real per-lecture flag, checked in getCourseDetails before
    // videoUrl is stripped for non-enrolled viewers.
    freePreview: {
        type: Boolean,
        default: false,
    },
    // Downloadable resources (slides, code samples, worksheets) attached
    // to this specific lecture. publicId is kept so the file can later be
    // deleted from Cloudinary if the attachment is removed.
    attachments: [
        {
            name: { type: String, required: true },
            url: { type: String, required: true },
            publicId: { type: String, required: true },
        },
    ],
    // AI substrate (P2/§6) — everything downstream (tutor, captions,
    // semantic search, quiz generation) reads from this. Populated by the
    // transcribe-pending cron job (src/api/controllers/Cron.js), not
    // synchronously on upload — Whisper on a long video can take well
    // longer than a request should block for.
    transcript: {
        type: String,
        default: "",
    },
    transcriptStatus: {
        type: String,
        enum: ["none", "pending", "processing", "done", "failed"],
        default: "none",
    },

})

module.exports =
  mongoose.models.SubSection || mongoose.model("SubSection",subSectionSchema)
