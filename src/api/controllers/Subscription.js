const { instance } = require("../config/razorpay")
const SubscriptionPlan = require("../models/SubscriptionPlan")
const UserSubscription = require("../models/UserSubscription")
const Course = require("../models/Course")
const { recordAudit } = require("../utils/recordAudit")

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
async function grantAllCourseAccess(userId) {
  const { enrollStudents } = require("./Payments")
  const publishedCourseIds = await Course.find({ status: "Published", deletedAt: null }).distinct("_id")
  if (publishedCourseIds.length === 0) return
  await enrollStudents(publishedCourseIds.map(String), userId)
}

exports.createPlan = async (req, res) => {
  try {
    const { name, priceRupees, interval } = req.body
    if (!name || !priceRupees || !["monthly", "yearly"].includes(interval)) {
      return res.status(400).json({ success: false, message: "name, priceRupees and interval (monthly/yearly) are required" })
    }

    const razorpayPlan = await instance.plans.create({
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
    console.error("createPlan failed", error)
    return res.status(500).json({ success: false, message: "Could not create plan" })
  }
}

exports.listPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ active: true }).lean()
    return res.status(200).json({ success: true, data: plans })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load plans" })
  }
}

exports.createSubscription = async (req, res) => {
  try {
    const { planId } = req.body
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

    const razorpaySub = await instance.subscriptions.create({
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
    console.error("createSubscription failed", error)
    return res.status(500).json({ success: false, message: "Could not start subscription" })
  }
}

exports.getMySubscription = async (req, res) => {
  try {
    const subscription = await UserSubscription.findOne({ user: req.user.id, status: { $ne: "cancelled" } })
      .populate("plan")
      .sort({ createdAt: -1 })
      .lean()
    return res.status(200).json({ success: true, data: subscription })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load subscription" })
  }
}

exports.cancelSubscription = async (req, res) => {
  try {
    const subscription = await UserSubscription.findOne({ user: req.user.id, status: { $ne: "cancelled" } })
    if (!subscription) {
      return res.status(404).json({ success: false, message: "No active subscription found" })
    }

    await instance.subscriptions.cancel(subscription.razorpaySubscriptionId)
    subscription.status = "cancelled"
    await subscription.save()

    return res.status(200).json({ success: true, message: "Subscription cancelled" })
  } catch (error) {
    console.error("cancelSubscription failed", error)
    return res.status(500).json({ success: false, message: "Could not cancel subscription" })
  }
}

/**
 * Called from the shared Razorpay webhook (Payments.js) for
 * subscription.activated / subscription.charged events — pure addition
 * to that file, no modification of the existing payment.captured branch.
 */
exports.handleSubscriptionWebhookEvent = async (event) => {
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
