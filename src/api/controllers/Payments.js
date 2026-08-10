const { instance } = require("../config/razorpay")
const Course = require("../models/Course")
const Payment = require("../models/Payment")
const Order = require("../models/Order")
const User = require("../models/User")
const mailSender = require("../utils/mailSender")
const {
  courseEnrollmentEmail,
} = require("../mail/templates/courseEnrollmentEmail")
const mongoose = require("mongoose")
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail")
const crypto = require("crypto")
const CourseProgress = require("../models/CourseProgress")
const Notification = require("../models/Notification")
const Coupon = require("../models/Coupon")
const { validateCouponForCart } = require("./Coupon")
const { creditReferralCommission } = require("./Affiliate")
const { emitEvent, EVENT_VERBS } = require("../utils/emitEvent")

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id)

const log = (event, data) =>
  console.log(JSON.stringify({ event, ...data, ts: new Date().toISOString() }))

/**
 * Atomically claims an order for settlement. The client callback and the
 * webhook race on every purchase — only the caller that flips status from
 * "created" to "paid" may enrol. The other observes null and treats it as
 * an idempotent no-op success.
 */
const settleOrder = async (orderId, paymentId) =>
  Order.findOneAndUpdate(
    { orderId, status: "created" },
    { $set: { status: "paid", paymentId } },
    { new: true }
  )

/**
 * Releases a claimed order back to "created" so a retry (client or webhook)
 * can pick it up, instead of the order being stuck "paid" with nobody
 * enrolled. Failure here is logged loudly — it is the one stuck state left,
 * and it is far narrower than what existed before this fix.
 */
const releaseOrder = async (orderId) => {
  try {
    await Order.updateOne(
      { orderId, status: "paid" },
      { $set: { status: "created" } }
    )
  } catch (rollbackError) {
    console.error(
      "CRITICAL: order stuck paid-but-unenrolled, manual fix required",
      orderId,
      rollbackError
    )
  }
}

/**
 * Best-effort usage counter — incremented only once an order actually
 * settles (paid + enrolled), never at checkout-start, so an abandoned
 * cart doesn't consume a limited-use coupon.
 */
const bumpCouponUsage = async (couponCode) => {
  if (!couponCode) return
  try {
    await Coupon.updateOne({ code: couponCode }, { $inc: { usedCount: 1 } })
  } catch (error) {
    console.error("bumpCouponUsage failed", couponCode, error.message)
  }
}

/**
 * Upsert that treats a duplicate-key race as success rather than an error.
 * Once the unique index on the filter fields exists, a genuine race between
 * the client and the webhook produces an E11000 on the loser — that IS the
 * desired end state (the row exists), so it's resolved by re-reading rather
 * than surfaced as a failure.
 */
const upsertIdempotent = async (Model, filter, setOnInsert) => {
  try {
    return await Model.findOneAndUpdate(
      filter,
      { $setOnInsert: setOnInsert },
      { new: true, upsert: true }
    )
  } catch (error) {
    if (error?.code === 11000) {
      return Model.findOne(filter)
    }
    throw error
  }
}

/**
 * Creates a Razorpay order AND persists what that order is for.
 * The persisted Order is the only source of truth at verification time —
 * the client never gets to say which courses a payment unlocks.
 */
exports.capturePayment = async (req, res) => {
  const { courses, couponCode } = req.body
  const userId = req.user.id

  if (!Array.isArray(courses) || courses.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Please select at least one course." })
  }

  // De-duplicate so a repeated id can't inflate the total or the grant.
  const courseIds = [...new Set(courses.map(String))]

  if (courseIds.some((id) => !isValidId(id))) {
    return res
      .status(400)
      .json({ success: false, message: "One or more course ids are invalid." })
  }

  try {
    const uid = new mongoose.Types.ObjectId(userId)
    let totalAmount = 0

    for (const courseId of courseIds) {
      const course = await Course.findById(courseId)

      if (!course) {
        return res
          .status(404)
          .json({ success: false, message: "Course not found." })
      }

      if (course.status !== "Published") {
        return res.status(400).json({
          success: false,
          message: `"${course.courseName}" is not available for purchase.`,
        })
      }

      if (course.studentsEnrolled.some((student) => student.equals(uid))) {
        return res.status(400).json({
          success: false,
          message: `You are already enrolled in "${course.courseName}".`,
        })
      }

      totalAmount += Number(course.price) || 0
    }

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "This order has no payable amount.",
      })
    }

    // Discount is computed here, server-side, from the coupon and the
    // priced-from-the-database totalAmount — never from a client-supplied
    // discount figure. A bad/expired code is silently ignored rather than
    // failing checkout outright; the coupon UI validates it separately
    // (checkCoupon) so a stale code shouldn't normally reach here at all.
    let discountAmount = 0
    let appliedCouponCode = null
    if (couponCode) {
      const result = await validateCouponForCart(couponCode, courseIds, totalAmount)
      if (result.valid) {
        discountAmount = result.discountAmountRupees
        appliedCouponCode = result.coupon.code
      }
    }

    const payableAmount = Math.max(0, totalAmount - discountAmount)
    const amountInPaise = Math.round(payableAmount * 100)
    const discountAmountInPaise = Math.round(discountAmount * 100)

    if (amountInPaise <= 0) {
      return res.status(400).json({
        success: false,
        message: "This order has no payable amount.",
      })
    }

    const paymentResponse = await instance.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${crypto.randomBytes(12).toString("hex")}`,
    })

    await Order.create({
      orderId: paymentResponse.id,
      user: userId,
      courses: courseIds,
      amount: amountInPaise,
      couponCode: appliedCouponCode,
      discountAmount: discountAmountInPaise,
      status: "created",
    })

    log("order_created", { orderId: paymentResponse.id, userId, amountInPaise })

    await emitEvent(EVENT_VERBS.CHECKOUT_STARTED, {
      actor: userId,
      object: { type: "Order", id: paymentResponse.id },
      context: { courseIds, amountInPaise },
    })

    return res.status(200).json({
      success: true,
      message: paymentResponse,
    })
  } catch (error) {
    console.error("capturePayment failed", error)
    return res
      .status(500)
      .json({ success: false, message: "Could not initiate the order." })
  }
}

/**
 * Verifies the Razorpay signature, then enrols from the STORED order.
 * Idempotent: a replayed request against an already-paid order is a no-op success.
 */
exports.verifyPayment = async (req, res) => {
  const razorpay_order_id = req.body?.razorpay_order_id
  const razorpay_payment_id = req.body?.razorpay_payment_id
  const razorpay_signature = req.body?.razorpay_signature
  const userId = req.user.id

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res
      .status(400)
      .json({ success: false, message: "Payment details are incomplete." })
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex")

  const expected = Buffer.from(expectedSignature, "utf8")
  const received = Buffer.from(String(razorpay_signature), "utf8")

  // Constant-time compare; lengths must match before timingSafeEqual is legal.
  const signatureValid =
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)

  if (!signatureValid) {
    return res
      .status(400)
      .json({ success: false, message: "Payment verification failed." })
  }

  try {
    const order = await Order.findOne({ orderId: razorpay_order_id })

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." })
    }

    if (order.user.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "This order belongs to another account." })
    }

    // Atomic claim: only one of {this request, a concurrent retry, the
    // webhook} may move the order from "created" to "paid". A null result
    // means someone else already settled it — idempotent success.
    const claimed = await settleOrder(razorpay_order_id, razorpay_payment_id)

    if (!claimed) {
      return res
        .status(200)
        .json({ success: true, message: "Payment already verified." })
    }

    log("order_settled", { orderId: razorpay_order_id, userId, source: "client" })

    try {
      await enrollStudents(claimed.courses, userId)
    } catch (enrollError) {
      await releaseOrder(razorpay_order_id)
      throw enrollError
    }

    await bumpCouponUsage(claimed.couponCode)
    await creditReferralCommission(claimed.user || userId, claimed.orderId, claimed.amount)

    await emitEvent(EVENT_VERBS.PURCHASE_COMPLETED, {
      actor: userId,
      object: { type: "Order", id: razorpay_order_id },
      context: { courseIds: claimed.courses, amount: claimed.amount, source: "client" },
    })

    return res
      .status(200)
      .json({ success: true, message: "Payment verified." })
  } catch (error) {
    console.error("verifyPayment failed", error)
    return res.status(500).json({
      success: false,
      message: "Payment succeeded but enrolment failed. Our team has been notified.",
    })
  }
}

/**
 * Idempotent enrolment — safe to run from both the client callback and a webhook.
 */
const enrollStudents = async (courses, userId) => {
  if (!courses?.length || !userId) {
    throw new Error("Missing courses or user for enrolment.")
  }

  for (const courseId of courses) {
    const enrolledCourse = await Course.findOneAndUpdate(
      { _id: courseId },
      { $addToSet: { studentsEnrolled: userId } },
      { new: true }
    )

    if (!enrolledCourse) {
      throw new Error("Course not found during enrolment.")
    }

    // upsert so a retry reuses the existing progress document
    const courseProgress = await upsertIdempotent(
      CourseProgress,
      { courseID: courseId, userId },
      { completedVideos: [] }
    )

    const enrolledStudent = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: {
          courses: courseId,
          courseProgress: courseProgress._id,
        },
      },
      { new: true }
    )

    if (!enrolledStudent) {
      throw new Error("User not found during enrolment.")
    }

    // Mail must never block or fail an enrolment that already succeeded.
    try {
      await mailSender(
        enrolledStudent.email,
        `Successfully enrolled in ${enrolledCourse.courseName}`,
        courseEnrollmentEmail(
          enrolledCourse.courseName,
          enrolledStudent.firstName
        )
      )
    } catch (error) {
      console.error("Enrolment email failed", error)
    }

    // In-app only, not through notify()'s dispatcher — the dedicated,
    // branded enrolment email above already covers this; a second generic
    // one would just be spam.
    try {
      await Notification.create({
        user: userId,
        type: "enrollment",
        title: `You're enrolled in ${enrolledCourse.courseName}`,
        link: `/courses/${courseId}`,
      })
    } catch (error) {
      console.error("Enrolment in-app notification failed", error)
    }
  }
}

exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId } = req.body
  const userId = req.user.id

  if (!orderId || !paymentId) {
    return res
      .status(400)
      .json({ success: false, message: "Order details are incomplete." })
  }

  try {
    // Amount comes from our record, never from the request body.
    const order = await Order.findOne({ orderId, user: userId })

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." })
    }

    const enrolledStudent = await User.findById(userId)

    if (!enrolledStudent) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." })
    }

    await mailSender(
      enrolledStudent.email,
      "Payment received",
      paymentSuccessEmail(
        enrolledStudent.firstName,
        order.amount / 100,
        orderId,
        paymentId
      )
    )

    return res
      .status(200)
      .json({ success: true, message: "Payment receipt sent." })
  } catch (error) {
    console.error("sendPaymentSuccessEmail failed", error)
    return res
      .status(500)
      .json({ success: false, message: "Could not send the receipt email." })
  }
}

exports.createPaymentEntry = async (req, res) => {
  const { orderId, paymentId } = req.body
  const userId = req.user.id

  if (!orderId || !paymentId) {
    return res
      .status(400)
      .json({ success: false, message: "Order details are incomplete." })
  }

  try {
    // Courses and amount are read from the stored order, not the client.
    const order = await Order.findOne({ orderId, user: userId })

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." })
    }

    // Idempotent: repeated calls must not create duplicate history rows.
    const payment = await upsertIdempotent(
      Payment,
      { orderId, consumer: userId },
      {
        consumer: userId,
        courses: order.courses,
        orderId,
        paymentId,
        amount: order.amount / 100,
      }
    )

    return res
      .status(201)
      .json({ success: true, message: "Payment recorded.", data: payment })
  } catch (error) {
    console.error("createPaymentEntry failed", error)
    return res
      .status(500)
      .json({ success: false, message: "Could not record the payment." })
  }
}

exports.getUserPaymentEntries = async (req, res) => {
  const userId = req.user.id

  try {
    const paymentEntries = await Payment.find({ consumer: userId })
      .populate({ path: "courses", select: "courseName" })
      .sort({ date: -1 })
      .lean()

    return res.status(200).json({ success: true, paymentEntries })
  } catch (error) {
    console.error("getUserPaymentEntries failed", error)
    return res
      .status(500)
      .json({ success: false, message: "Could not load your purchase history." })
  }
}

exports.enrollStudents = enrollStudents

/**
 * Razorpay webhook — the authoritative enrolment path.
 * The browser callback is a fast path; this is what makes enrolment survive a
 * closed tab, a dropped connection, or a failed client request.
 * Mounted with express.raw so the signature is verified over the exact bytes.
 */
exports.razorpayWebhook = async (req, res) => {
  const secret = process.env.WEBHOOK_SECRET

  if (!secret) {
    console.error("WEBHOOK_SECRET is not configured; webhook rejected")
    return res.status(500).json({ success: false })
  }

  const signature = req.headers["x-razorpay-signature"]
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body))

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
  const expectedBuf = Buffer.from(expected, "utf8")
  const receivedBuf = Buffer.from(String(signature ?? ""), "utf8")

  const valid =
    expectedBuf.length === receivedBuf.length &&
    crypto.timingSafeEqual(expectedBuf, receivedBuf)

  if (!valid) {
    return res.status(400).json({ success: false, message: "Invalid signature" })
  }

  let event
  try {
    event = JSON.parse(rawBody.toString("utf8"))
  } catch (error) {
    return res.status(400).json({ success: false, message: "Malformed payload" })
  }

  const orderId = event?.payload?.payment?.entity?.order_id
  log("webhook_received", { event: event?.event, orderId })

  // Subscription lifecycle events — a separate, additive branch that never
  // touches the payment.captured path above it. Lazy require to avoid a
  // circular load with Subscription.js (see its own comment on this).
  if (event?.event?.startsWith("subscription.")) {
    try {
      const { handleSubscriptionWebhookEvent } = require("./Subscription")
      await handleSubscriptionWebhookEvent(event)
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error("subscription webhook handling failed", event.event, error)
      return res.status(500).json({ success: false })
    }
  }

  if (event?.event !== "payment.captured") {
    return res.status(200).json({ success: true })
  }

  // Enrolment is awaited BEFORE responding. On Vercel the function instance
  // can freeze the moment a response is flushed, so post-response work is
  // not guaranteed to run — that was the bug: purchases could be marked
  // paid with the enrolment silently never happening. Razorpay's own
  // timeout is generous, and returning a non-2xx on failure makes it retry
  // (up to 24h), so awaiting here is strictly safer than acking early.
  try {
    const payment = event.payload?.payment?.entity

    if (!orderId) {
      return res.status(200).json({ success: true })
    }

    const order = await Order.findOne({ orderId })

    if (!order) {
      console.error("Webhook: order not found", orderId)
      return res.status(200).json({ success: true })
    }

    const claimed = await settleOrder(orderId, payment.id)

    if (!claimed) {
      // Already settled by the client callback or an earlier delivery.
      return res.status(200).json({ success: true, message: "Already settled" })
    }

    try {
      await enrollStudents(claimed.courses, claimed.user)
    } catch (enrollError) {
      await releaseOrder(orderId)
      throw enrollError
    }

    await bumpCouponUsage(claimed.couponCode)
    await creditReferralCommission(claimed.user || userId, claimed.orderId, claimed.amount)

    // Backfill the purchase-history row if the client never got to it.
    await upsertIdempotent(
      Payment,
      { orderId, consumer: claimed.user },
      {
        consumer: claimed.user,
        courses: claimed.courses,
        orderId,
        paymentId: payment.id,
        amount: claimed.amount / 100,
      }
    )

    await emitEvent(EVENT_VERBS.PURCHASE_COMPLETED, {
      actor: claimed.user,
      object: { type: "Order", id: orderId },
      context: { courseIds: claimed.courses, amount: claimed.amount, source: "webhook" },
    })

    log("webhook_settled", { orderId, userId: String(claimed.user) })
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error("webhook_failed", orderId, error)
    // Non-2xx so Razorpay retries — a transient DB/mail failure here must
    // not be silently dropped the way it was before this fix.
    return res.status(500).json({ success: false })
  }
}
