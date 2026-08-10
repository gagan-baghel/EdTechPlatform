const Course = require("../models/Course")
const SubSection = require("../models/SubSection")
const { recordAudit } = require("../utils/recordAudit")
const { transcribeAudioUrl } = require("../utils/ai")

/**
 * Publishes every course whose scheduledPublishAt has passed. Meant to be
 * hit by Vercel Cron (see vercel.json's crons entry) — this endpoint does
 * not schedule anything itself, it's the thing that runs ON the schedule.
 */
/**
 * Cloudinary serves the audio track of a video resource by inserting an
 * f_mp3 transformation into the delivery URL — no separate audio upload
 * needed. Video URLs here are always our own Cloudinary URLs (validated
 * at upload time in Subsection.js), not user input, so this string
 * insertion is safe.
 */
function deriveAudioUrl(videoUrl) {
  return videoUrl.replace("/video/upload/", "/video/upload/f_mp3/")
}

const MAX_TRANSCRIPTIONS_PER_RUN = 3

/**
 * Picks up lectures uploaded since the last run and transcribes them.
 * Deliberately NOT synchronous with lecture upload (createSubSection) —
 * Whisper on a real lecture-length video can take well past what a
 * request should block on, and this function's own maxDuration is 60s
 * (app.js), so it caps itself to a few lectures per run rather than
 * trying to drain the whole queue at once.
 */
exports.transcribePendingLectures = async (req, res) => {
  try {
    const pending = await SubSection.find({ transcriptStatus: "pending" }).limit(MAX_TRANSCRIPTIONS_PER_RUN)

    if (pending.length === 0) {
      return res.status(200).json({ success: true, processed: 0 })
    }

    const results = []
    for (const subSection of pending) {
      subSection.transcriptStatus = "processing"
      await subSection.save()

      try {
        const audioUrl = deriveAudioUrl(subSection.videoUrl)
        const transcript = await transcribeAudioUrl(audioUrl)
        subSection.transcript = transcript
        subSection.transcriptStatus = "done"
        await subSection.save()
        results.push({ subSectionId: subSection._id, status: "done" })
      } catch (error) {
        subSection.transcriptStatus = "failed"
        await subSection.save()
        console.error("transcribePendingLectures: failed", subSection._id, error.message)
        results.push({ subSectionId: subSection._id, status: "failed", error: error.message })
      }
    }

    console.log(JSON.stringify({ event: "cron_transcribe", processed: results.length, results }))

    return res.status(200).json({ success: true, processed: results.length, results })
  } catch (error) {
    console.error("transcribePendingLectures failed", error)
    return res.status(500).json({ success: false, message: "Could not process transcriptions" })
  }
}

exports.publishScheduledCourses = async (req, res) => {
  try {
    const due = await Course.find({
      status: "Draft",
      deletedAt: null,
      scheduledPublishAt: { $lte: new Date() },
    })

    const published = []
    for (const course of due) {
      course.status = "Published"
      course.scheduledPublishAt = null
      await course.save()
      published.push(course._id)

      await recordAudit({
        actor: course.instructor,
        action: "course.auto_publish_scheduled",
        targetType: "Course",
        targetId: course._id,
      })
    }

    console.log(JSON.stringify({ event: "cron_publish_scheduled", publishedCount: published.length }))

    return res.status(200).json({ success: true, publishedCount: published.length, publishedIds: published })
  } catch (error) {
    console.error("publishScheduledCourses failed", error)
    return res.status(500).json({ success: false, message: "Could not publish scheduled courses" })
  }
}
