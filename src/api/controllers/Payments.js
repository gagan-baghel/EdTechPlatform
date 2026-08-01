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

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id)

/**
 * Creates a Razorpay order AND persists what that order is for.
 * The persisted Order is the only source of truth at verification time —
 * the client never gets to say which courses a payment unlocks.
 */
exports.capturePayment = async (req, res) => {
  const { courses } = req.body
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

    const amountInPaise = Math.round(totalAmount * 100)

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
      status: "created",
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

    // Already processed — treat as success so a retry never double-charges logic.
    if (order.status === "paid") {
      return res
        .status(200)
        .json({ success: true, message: "Payment already verified." })
    }

    await enrollStudents(order.courses, userId)

    order.status = "paid"
    order.paymentId = razorpay_payment_id
    await order.save()

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
    const courseProgress = await CourseProgress.findOneAndUpdate(
      { courseID: courseId, userId },
      { $setOnInsert: { completedVideos: [] } },
      { new: true, upsert: true }
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
    const payment = await Payment.findOneAndUpdate(
      { orderId, consumer: userId },
      {
        $setOnInsert: {
          consumer: userId,
          courses: order.courses,
          orderId,
          paymentId,
          amount: order.amount / 100,
        },
      },
      { new: true, upsert: true }
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

  // Acknowledge fast; Razorpay retries on non-2xx and we never want a slow
  // enrolment to trigger duplicate deliveries.
  res.status(200).json({ success: true })

  if (event?.event !== "payment.captured") return

  try {
    const payment = event.payload?.payment?.entity
    const orderId = payment?.order_id

    if (!orderId) return

    const order = await Order.findOne({ orderId })

    if (!order || order.status === "paid") return

    await enrollStudents(order.courses, order.user)

    order.status = "paid"
    order.paymentId = payment.id
    await order.save()

    // Backfill the purchase-history row if the client never got to it.
    await Payment.findOneAndUpdate(
      { orderId, consumer: order.user },
      {
        $setOnInsert: {
          consumer: order.user,
          courses: order.courses,
          orderId,
          paymentId: payment.id,
          amount: order.amount / 100,
        },
      },
      { upsert: true }
    )

    console.log(`Webhook enrolled user ${order.user} for order ${orderId}`)
  } catch (error) {
    console.error("Webhook enrolment failed", error)
  }
}
