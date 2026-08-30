import { z } from "zod"
import type { Response } from "express"
import type { Types } from "mongoose"

import { fail, parseOrThrow } from "../lib/respond"
import { objectId, text } from "../lib/schemas"
import type { AuthedRequest } from "../lib/http"
import Course from "../models/Course"
import Organization from "../models/Organization"
import { recordAudit } from "../utils/recordAudit"

/**
 * B2B seats: an organisation holds N prepaid seats for a set of courses, and
 * anyone with the invite code consumes one seat and is enrolled.
 *
 * SECURITY — why creation is admin-only.
 *
 * This endpoint grants enrolment in arbitrary courses without any payment
 * step, because seats are sold out-of-band (invoice, contract) and then
 * provisioned. It previously required only `auth`, with no role check and no
 * validation of which courses could be listed, so ANY logged-in user could:
 *
 *   POST /organizations  { name: "x", courses: [{ courseId: <any paid course>,
 *                                                 seatsTotal: 999999 }] }
 *   POST /organizations/join { inviteCode: <the code just returned> }
 *
 * and enrol themselves — and anyone they shared the code with — in every paid
 * course on the platform for free. That is a complete bypass of checkout.
 * Restricting provisioning to Admin is the fix: there is no self-serve
 * purchase path for seats, so a self-serve provisioning path cannot be
 * legitimate.
 */

const MAX_SEATS_PER_COURSE = 10_000

const CreateOrganizationSchema = z.object({
  name: text({ max: 200, label: "Organisation name" }),
  courses: z
    .array(
      z.object({
        courseId: objectId("A valid course id is required"),
        seatsTotal: z.coerce
          .number()
          .int()
          .min(1, "Each course needs at least one seat")
          .max(MAX_SEATS_PER_COURSE, `At most ${MAX_SEATS_PER_COURSE} seats per course`),
      })
    )
    .min(1, "At least one course/seat pair is required")
    .max(50, "At most 50 courses per organisation"),
})

const JoinOrganizationSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-F0-9]{12}$/, "That invite code is not valid"),
})

export const createOrganization = async (req: AuthedRequest, res: Response) => {
  try {
    const { name, courses } = parseOrThrow(CreateOrganizationSchema, req.body)

    const courseIds = courses.map((entry) => entry.courseId)
    if (new Set(courseIds).size !== courseIds.length) {
      return res.status(400).json({
        success: false,
        message: "Each course may appear only once.",
      })
    }

    // Seats can only be granted for courses that actually exist and are
    // live — otherwise a typo silently creates seats that enrol nobody, and
    // a draft course can be handed out before its author has published it.
    const publishedCount = await Course.countDocuments({
      _id: { $in: courseIds },
      status: "Published",
      deletedAt: null,
    })
    if (publishedCount !== courseIds.length) {
      return res.status(400).json({
        success: false,
        message: "Every course must exist and be published.",
      })
    }

    const org = await Organization.create({
      name,
      owner: req.user.id,
      inviteCode: Organization.generateInviteCode(),
      courses: courses.map((entry) => ({
        course: entry.courseId,
        seatsTotal: entry.seatsTotal,
      })),
      members: [],
    })

    // Provisioning seats is granting paid access without a payment; it belongs
    // in the audit log next to refunds and takedowns.
    await recordAudit({
      actor: req.user.id,
      action: "organization.create",
      targetType: "Organization",
      targetId: org._id,
      details: { name, courses: courses.length, seats: courses.reduce((n, c) => n + c.seatsTotal, 0) },
    })

    return res.status(201).json({ success: true, data: org })
  } catch (error) {
    return fail(res, error, "createOrganization", "Could not create organization")
  }
}

export const getMyOrganizations = async (req: AuthedRequest, res: Response) => {
  try {
    const orgs = await Organization.find({ owner: req.user.id })
      .populate("courses.course", "courseName")
      .limit(100)
      .lean()
    return res.status(200).json({ success: true, data: orgs })
  } catch (error) {
    return fail(res, error, "getMyOrganizations", "Could not load organizations")
  }
}

/**
 * Consumes one seat for `courseId`, or reports that there were none.
 *
 * Compare-and-swap on the observed `seatsUsed`: the update only applies if the
 * counter is still what we read, so two people redeeming the last seat at the
 * same time cannot both succeed. Mongo cannot compare two fields of the same
 * array element in a plain query filter, and the loser of a race would
 * otherwise be told "no seats" while a seat was in fact free — hence the small
 * bounded retry rather than a single attempt.
 */
async function claimSeat(
  orgId: Types.ObjectId,
  courseId: Types.ObjectId,
  attempts = 3
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const current = await Organization.findOne(
      { _id: orgId, "courses.course": courseId },
      { "courses.$": 1 }
    ).lean()

    const entry = current?.courses?.[0]
    if (!entry || entry.seatsUsed >= entry.seatsTotal) return false

    const result = await Organization.updateOne(
      {
        _id: orgId,
        courses: { $elemMatch: { course: courseId, seatsUsed: entry.seatsUsed } },
      },
      { $inc: { "courses.$.seatsUsed": 1 } }
    )
    if (result.modifiedCount > 0) return true
  }
  return false
}

/**
 * A member joins via invite code, consuming one seat per course with capacity.
 *
 * Both the membership claim and each seat are taken with conditional updates
 * (see `claimSeat`). The previous version incremented `seatsUsed` in memory
 * and saved the whole document, so two people redeeming the last seat at the
 * same time both read `seatsUsed < seatsTotal`, both incremented, and the
 * organisation ended up over-subscribed — the platform giving away access
 * nobody paid for.
 */
export const joinOrganization = async (req: AuthedRequest, res: Response) => {
  try {
    const { inviteCode } = parseOrThrow(JoinOrganizationSchema, req.body)

    const org = await Organization.findOne({ inviteCode })
    if (!org) {
      return res.status(404).json({ success: false, message: "Invalid invite code" })
    }

    // Claim membership first, conditionally — this is also what makes a
    // double-clicked "Join" button consume one set of seats rather than two.
    const claimed = await Organization.findOneAndUpdate(
      { _id: org._id, members: { $ne: req.user.id } },
      { $addToSet: { members: req.user.id } }
    )
    if (!claimed) {
      return res
        .status(409)
        .json({ success: false, message: "You have already joined this organization" })
    }

    const enrolledCourseIds: string[] = []
    for (const entry of claimed.courses) {
      if (await claimSeat(org._id, entry.course)) {
        enrolledCourseIds.push(entry.course.toString())
      }
    }

    if (enrolledCourseIds.length === 0) {
      // Nothing was consumed, so the membership claim has to be released or
      // the user is a member who can never be enrolled and can never retry.
      await Organization.updateOne({ _id: org._id }, { $pull: { members: req.user.id } })
      return res.status(409).json({ success: false, message: "No seats available" })
    }

    const { enrollStudents } = await import("./Payments")
    await enrollStudents(enrolledCourseIds, req.user.id)

    return res.status(200).json({
      success: true,
      message: `Joined ${claimed.name}`,
      data: { enrolledCourseIds },
    })
  } catch (error) {
    return fail(res, error, "joinOrganization", "Could not join organization")
  }
}
