import { z } from "zod"
import type { Types } from "mongoose"
import { fail, parseOrThrow } from "../lib/respond"
import { objectId, rupees, text } from "../lib/schemas"

/**
 * Only the fields this handler reads. Razorpay's payload is far larger; typing
 * the whole thing would be guesswork against an API we don't control, and this
 * is untrusted input either way — every field is checked before use.
 */
interface RazorpaySubscriptionEvent {
  event?: string
  payload?: {
    subscription?: {
      entity?: { id?: string; status?: string }
    }
  }
}
import type { Request, Response } from "express"
import type { AuthedRequest } from "../lib/http"
import { getRazorpay } from "../config/razorpay"
import SubscriptionPlan from "../models/SubscriptionPlan"
import UserSubscription from "../models/UserSubscription"
import Course from "../models/Course"
import { recordAudit } from "../utils/recordAudit"

const CreatePlanSchema = z.object({
  name: text({ max: 120, label: "Plan name" }),
  priceRupees: rupees().refine((value) => value > 0, "Plan price must be greater than zero"),
  interval: z.enum(["monthly", "yearly"]),
})

/** Cap on how many courses one subscription activation will enrol in a single pass. */
const MAX_GRANT_PER_ACTIVATION = 200

/**
 * v1 scope: an active subscription bulk-enrolls the student in every
 * currently-published course, using the SAME enrollStudents() the
 * one-time-purchase flow uses — reuses the idempotent, already-hardened
 * enrolment path rather than inventing a parallel "has subscription"
 * check that would need to be threaded through every access-control site
 * in the app (course view, quizzes, Q&A, certificates, notes...). The
 * real limitation this creates: a course PUBLISHED AFTER a student
 * subscribes is not automatically granted — re-running this on each
 * renewal (subscription.charged) is what keeps it reasonably fresh.
 *
 * require("./Payments") is deliberately lazy (inside the function, not at
 * module scope): Payments.js will need to require this module too, to
 * hand subscription webhook events off to handleSubscriptionWebhookEvent
 * below. A top-level require on either side would be a circular import
 * resolved at load order — Node would hand back an incomplete exports
 * object to whichever file loads second. Requiring lazily, at call time
 * rather than load time, sidesteps that entirely since both modules have
 * always finished loading by the time a webhook actually fires.
 */
async function grantAllCourseAccess(userId: Types.ObjectId | string) {
  const { enrollStudents } = await import("./Payments")

  // Bounded. `enrollStudents` sends an email per course, so an unbounded
  // catalogue meant one webhook delivery doing thousands of sequential SMTP
  // round-trips inside a 60s function — it times out, Razorpay sees a 5xx,
  // retries, and the whole thing repeats without ever completing.
  const publishedCourseIds = await Course.find({ status: "Published", deletedAt: null })
    .sort({ createdAt: -1 })
    .limit(MAX_GRANT_PER_ACTIVATION)
    .distinct("_id")

  if (publishedCourseIds.length === 0) return
  await enrollStudents(publishedCourseIds.map(String), userId)
}

export const createPlan = async (req: AuthedRequest, res: Response) => {
  try {
    const { name, priceRupees, interval } = parseOrThrow(CreatePlanSchema, req.body)

    const razorpayPlan = await getRazorpay().plans.create({
      period: interval === "monthly" ? "monthly" : "yearly",
      interval: 1,
      item: {
        name,
        amount: Math.round(priceRupees * 100),
        currency: "INR",
      },
    })

    const plan = await SubscriptionPlan.create({
      razorpayPlanId: razorpayPlan.id,
      name,
      priceRupees,
      interval,
    })

    await recordAudit({ actor: req.user.id, action: "subscription_plan.create", targetType: "SubscriptionPlan", targetId: plan._id })

    return res.status(201).json({ success: true, data: plan })
  } catch (error) {
    return fail(res, error, "createPlan", "Could not create plan")
  }
}

export const listPlans = async (req: Request, res: Response) => {
  try {
    const plans = await SubscriptionPlan.find({ active: true }).lean()
    return res.status(200).json({ success: true, data: plans })
  } catch (error) {
    return fail(res, error, "listPlans", "Could not load plans")
  }
}

export const createSubscription = async (req: AuthedRequest, res: Response) => {
  try {
    const { planId } = parseOrThrow(
      z.object({ planId: objectId("A valid plan id is required") }),
      req.body
    )
    const plan = await SubscriptionPlan.findById(planId)
    if (!plan || !plan.active) {
      return res.status(404).json({ success: false, message: "Plan not found" })
    }

    const existing = await UserSubscription.findOne({ user: req.user.id, status: { $in: ["created", "active"] } })
    if (existing) {
      return res.status(400).json({ success: false, message: "You already have an active subscription" })
    }

    // total_count: Razorpay requires a bound on billing cycles even for
    // "indefinite" subscriptions — 120 cycles (10yr monthly / 120yr yearly
    // is absurd, so cap distinctly) is a practical stand-in for "renews
    // until cancelled" without an actual unbounded option in their API.
    const totalCount = plan.interval === "monthly" ? 120 : 20

    const razorpaySub = await getRazorpay().subscriptions.create({
      plan_id: plan.razorpayPlanId,
      customer_notify: 1,
      total_count: totalCount,
      notes: { userId: req.user.id.toString() },
    })

    const subscription = await UserSubscription.create({
      user: req.user.id,
      plan: plan._id,
      razorpaySubscriptionId: razorpaySub.id,
      status: "created",
    })

    return res.status(201).json({
      success: true,
      data: { subscriptionId: razorpaySub.id, dbId: subscription._id },
    })
  } catch (error) {
    return fail(res, error, "createSubscription", "Could not start subscription")
  }
}

export const getMySubscription = async (req: AuthedRequest, res: Response) => {
  try {
    const subscription = await UserSubscription.findOne({ user: req.user.id, status: { $ne: "cancelled" } })
      .populate("plan")
      .sort({ createdAt: -1 })
      .lean()
    return res.status(200).json({ success: true, data: subscription })
  } catch (error) {
    return fail(res, error, "getMySubscription", "Could not load subscription")
  }
}

export const cancelSubscription = async (req: AuthedRequest, res: Response) => {
  try {
    const subscription = await UserSubscription.findOne({ user: req.user.id, status: { $ne: "cancelled" } })
    if (!subscription) {
      return res.status(404).json({ success: false, message: "No active subscription found" })
    }

    await getRazorpay().subscriptions.cancel(subscription.razorpaySubscriptionId)
    subscription.status = "cancelled"
    await subscription.save()

    return res.status(200).json({ success: true, message: "Subscription cancelled" })
  } catch (error) {
    return fail(res, error, "cancelSubscription", "Could not cancel subscription")
  }
}

/**
 * Called from the shared Razorpay webhook (Payments.js) for
 * subscription.activated / subscription.charged events — pure addition
 * to that file, no modification of the existing payment.captured branch.
 */
export const handleSubscriptionWebhookEvent = async (
  event: RazorpaySubscriptionEvent
) => {
  const entity = event?.payload?.subscription?.entity
  if (!entity) return

  const subscription = await UserSubscription.findOne({ razorpaySubscriptionId: entity.id })
  if (!subscription) return

  if (event.event === "subscription.activated" || event.event === "subscription.charged") {
    subscription.status = "active"
    await subscription.save()
    await grantAllCourseAccess(subscription.user)
  } else if (event.event === "subscription.cancelled" || event.event === "subscription.halted") {
    subscription.status = "cancelled"
    await subscription.save()
  }
}
