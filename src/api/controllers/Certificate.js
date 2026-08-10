const Certificate = require("../models/Certificate")
const Course = require("../models/Course")
const CourseProgress = require("../models/CourseProgress")
const { hasPassedAllCourseQuizzes } = require("./Quiz")
const { emitEvent, EVENT_VERBS } = require("../utils/emitEvent")
const { notify } = require("../utils/notify")

/**
 * Auto-issues a certificate the moment a student has watched every
 * lecture AND passed every published course-level quiz (lecture-level
 * quizzes don't gate this — see hasPassedAllCourseQuizzes). Called from
 * courseProgress.js after every progress update; idempotent via the
 * unique {user, course} index, so calling it on every heartbeat that
 * happens to complete a course is safe — no duplicate-issue race.
 */
async function checkAndIssueCertificate(userId, courseId) {
  try {
    const existing = await Certificate.findOne({ user: userId, course: courseId })
    if (existing) return existing

    const course = await Course.findById(courseId).populate({
      path: "courseContent",
      populate: { path: "subSection", select: "_id" },
    })
    if (!course) return null

    const totalLectures = course.courseContent.reduce(
      (sum, section) => sum + (section.subSection?.length || 0),
      0
    )
    if (totalLectures === 0) return null

    const progress = await CourseProgress.findOne({ courseID: courseId, userId })
    const completedCount = progress?.completedVideos?.length || 0
    if (completedCount < totalLectures) return null

    const passedQuizzes = await hasPassedAllCourseQuizzes(courseId, userId)
    if (!passedQuizzes) return null

    const certificate = await Certificate.create({
      user: userId,
      course: courseId,
      certificateNumber: Certificate.generateCertificateNumber(),
    })

    await emitEvent(EVENT_VERBS.CERTIFICATE_EARNED, {
      actor: userId,
      object: { type: "Course", id: courseId },
      context: { certificateNumber: certificate.certificateNumber },
    })

    await notify(userId, {
      type: "certificate_earned",
      title: `You earned a certificate for ${course.courseName}`,
      body: `Congratulations on completing "${course.courseName}"! Your certificate is ready.`,
      link: `/certificates/${certificate.certificateNumber}`,
    })

    return certificate
  } catch (error) {
    // A duplicate-key error here means a concurrent call already issued
    // it — not a real failure. Anything else is logged but never thrown:
    // certificate issuance must never break the progress update it rides
    // alongside.
    if (error?.code !== 11000) {
      console.error("checkAndIssueCertificate failed", error)
    }
    return null
  }
}

exports.checkAndIssueCertificate = checkAndIssueCertificate

exports.getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ user: req.user.id })
      .populate("course", "courseName thumbnail")
      .sort({ issuedAt: -1 })
      .lean()
    return res.status(200).json({ success: true, data: certificates })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load certificates" })
  }
}

// Public — no auth. A certificate's whole purpose is that a third party
// (an employer) can verify it without needing an account.
exports.verifyCertificate = async (req, res) => {
  try {
    const { certificateNumber } = req.params
    const certificate = await Certificate.findOne({ certificateNumber })
      .populate("user", "firstName lastName")
      .populate("course", "courseName")
      .lean()

    if (!certificate) {
      return res.status(404).json({ success: false, message: "No certificate found with that number" })
    }

    return res.status(200).json({
      success: true,
      data: {
        certificateNumber: certificate.certificateNumber,
        studentName: `${certificate.user.firstName} ${certificate.user.lastName}`,
        courseName: certificate.course.courseName,
        issuedAt: certificate.issuedAt,
      },
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not verify certificate" })
  }
}
