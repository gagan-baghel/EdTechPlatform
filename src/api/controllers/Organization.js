const Organization = require("../models/Organization")

exports.createOrganization = async (req, res) => {
  try {
    const { name, courses } = req.body // courses: [{courseId, seatsTotal}]
    if (!name || !Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ success: false, message: "name and at least one course/seat pair are required" })
    }

    const org = await Organization.create({
      name,
      owner: req.user.id,
      inviteCode: Organization.generateInviteCode(),
      courses: courses.map((c) => ({ course: c.courseId, seatsTotal: c.seatsTotal })),
      members: [],
    })

    return res.status(201).json({ success: true, data: org })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not create organization" })
  }
}

exports.getMyOrganizations = async (req, res) => {
  try {
    const orgs = await Organization.find({ owner: req.user.id }).populate("courses.course", "courseName").lean()
    return res.status(200).json({ success: true, data: orgs })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load organizations" })
  }
}

/**
 * A member joins via invite code, consuming one seat per course the org
 * has capacity for, and is enrolled the same way a one-time purchase
 * enrolls someone — see the lazy-require note in Subscription.js for why
 * this isn't a top-level import of enrollStudents.
 */
exports.joinOrganization = async (req, res) => {
  try {
    const { inviteCode } = req.body
    const org = await Organization.findOne({ inviteCode: inviteCode?.trim().toUpperCase() })
    if (!org) {
      return res.status(404).json({ success: false, message: "Invalid invite code" })
    }

    if (org.members.some((m) => m.toString() === req.user.id)) {
      return res.status(400).json({ success: false, message: "You have already joined this organization" })
    }

    const availableCourseIds = []
    for (const entry of org.courses) {
      if (entry.seatsUsed < entry.seatsTotal) {
        entry.seatsUsed += 1
        availableCourseIds.push(entry.course.toString())
      }
    }

    if (availableCourseIds.length === 0) {
      return res.status(400).json({ success: false, message: "No seats available" })
    }

    org.members.push(req.user.id)
    await org.save()

    const { enrollStudents } = require("./Payments")
    await enrollStudents(availableCourseIds, req.user.id)

    return res.status(200).json({ success: true, message: `Joined ${org.name}`, data: { enrolledCourseIds: availableCourseIds } })
  } catch (error) {
    console.error("joinOrganization failed", error)
    return res.status(500).json({ success: false, message: "Could not join organization" })
  }
}
