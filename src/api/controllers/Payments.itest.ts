import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import {
  api,
  capturedPaymentEvent,
  clearDatabase,
  createCourse,
  createUser,
  ensureIndexes,
  razorpayOrderSignature,
  razorpayWebhookSignature,
  startTestServer,
  stopTestServer,
  type TestCourse,
  type TestUser,
} from "../test/harness"
import { resetRazorpayFake } from "../test/fakes/razorpay"
import { resetMailFake, sentMail } from "../test/fakes/nodemailer"

/**
 * The purchase path, end to end, against a real database.
 *
 * This is the flow that had never once been executed: checkout creates a
 * Razorpay order and a local Order, the browser callback verifies a signature
 * and enrols, and a webhook does the same job independently so a closed tab
 * cannot lose a purchase. Money and idempotency live here, so this is where
 * "the API returns 200" is least trustworthy as a proxy for correctness.
 */

let student: TestUser
let instructor: TestUser
let course: TestCourse

beforeAll(async () => {
  await startTestServer()
  await ensureIndexes()
}, 60000)

afterAll(async () => {
  await stopTestServer()
})

beforeEach(async () => {
  await clearDatabase()
  await ensureIndexes()
  resetRazorpayFake()
  resetMailFake()
  instructor = await createUser("Instructor")
  student = await createUser("Student")
  course = await createCourse(instructor.id, { price: 1000 })
})

async function startCheckout(user = student, courses = [course.id]) {
  return api().post("/api/v1/payment/capturePayment").set(user.auth).send({ courses })
}

describe("checkout", () => {
  it("creates an order priced from the database, not the request", async () => {
    // A client that sends its own price must not be believed.
    const res = await api()
      .post("/api/v1/payment/capturePayment")
      .set(student.auth)
      .send({ courses: [course.id], amount: 1, price: 1 })

    expect(res.status).toBe(200)

    const Order = (await import("../models/Order")).default
    const stored = await Order.findOne({ orderId: res.body.message.id })
    expect(stored).not.toBeNull()
    // 1000 rupees, stored in paise.
    expect(stored!.amount).toBe(100000)
    expect(stored!.status).toBe("created")
  })

  it("refuses a course that is not published", async () => {
    const draft = await createCourse(instructor.id, { status: "Draft" })
    const res = await startCheckout(student, [draft.id])
    expect(res.status).toBe(400)
  })

  it("refuses to sell a course the student already owns", async () => {
    const owned = await createCourse(instructor.id, { studentsEnrolled: [student.id] })
    const res = await startCheckout(student, [owned.id])
    expect(res.status).toBe(400)
  })

  it("rejects a malformed course id before touching Razorpay", async () => {
    const res = await startCheckout(student, ["not-an-id"])
    expect(res.status).toBe(400)
    const { razorpayCalls } = await import("../test/fakes/razorpay")
    expect(razorpayCalls).toHaveLength(0)
  })

  it("requires a student account", async () => {
    expect((await startCheckout(instructor)).status).toBe(403)
    const anon = await api().post("/api/v1/payment/capturePayment").send({ courses: [course.id] })
    expect(anon.status).toBe(401)
  })
})

describe("payment verification", () => {
  async function checkoutThenVerify(signature?: string, as: TestUser = student) {
    const order = await startCheckout()
    const orderId = order.body.message.id as string
    const paymentId = "pay_test_0001"
    const res = await api()
      .post("/api/v1/payment/verifyPayment")
      .set(as.auth)
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature ?? razorpayOrderSignature(orderId, paymentId),
      })
    return { res, orderId }
  }

  it("enrols the student on a valid signature", async () => {
    const { res, orderId } = await checkoutThenVerify()
    expect(res.status).toBe(200)

    const Course = (await import("../models/Course")).default
    const User = (await import("../models/User")).default
    const Order = (await import("../models/Order")).default

    const enrolled = await Course.findById(course.id)
    expect(enrolled!.studentsEnrolled.map(String)).toContain(student.id)

    const updated = await User.findById(student.id)
    expect(updated!.courses.map(String)).toContain(course.id)

    expect((await Order.findOne({ orderId }))!.status).toBe("paid")
    // Enrolment is confirmed by email.
    expect(sentMail.some((m) => m.to === student.email)).toBe(true)
  })

  it("creates a progress record so the player has somewhere to write", async () => {
    await checkoutThenVerify()
    const CourseProgress = (await import("../models/CourseProgress")).default
    expect(await CourseProgress.findOne({ courseID: course.id, userId: student.id })).not.toBeNull()
  })

  it("rejects a forged signature and enrols nobody", async () => {
    const { res } = await checkoutThenVerify("deadbeef")
    expect(res.status).toBe(400)

    const Course = (await import("../models/Course")).default
    expect((await Course.findById(course.id))!.studentsEnrolled).toHaveLength(0)
  })

  it("refuses to settle an order belonging to someone else", async () => {
    // A valid signature proves Razorpay signed the order, not that the caller
    // placed it — the classic BOLA in a payment flow.
    const other = await createUser("Student")
    const { res } = await checkoutThenVerify(undefined, other)
    expect(res.status).toBe(403)

    const Course = (await import("../models/Course")).default
    expect((await Course.findById(course.id))!.studentsEnrolled).toHaveLength(0)
  })

  it("is idempotent: replaying the callback enrols once", async () => {
    const order = await startCheckout()
    const orderId = order.body.message.id as string
    const paymentId = "pay_test_replay"
    const body = {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: razorpayOrderSignature(orderId, paymentId),
    }

    const first = await api().post("/api/v1/payment/verifyPayment").set(student.auth).send(body)
    const second = await api().post("/api/v1/payment/verifyPayment").set(student.auth).send(body)

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const Course = (await import("../models/Course")).default
    const enrolled = (await Course.findById(course.id))!.studentsEnrolled.map(String)
    expect(enrolled.filter((id: string) => id === student.id)).toHaveLength(1)
  })

  it("survives two callbacks racing", async () => {
    const order = await startCheckout()
    const orderId = order.body.message.id as string
    const paymentId = "pay_test_race"
    const body = {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: razorpayOrderSignature(orderId, paymentId),
    }

    const results = await Promise.all([
      api().post("/api/v1/payment/verifyPayment").set(student.auth).send(body),
      api().post("/api/v1/payment/verifyPayment").set(student.auth).send(body),
      api().post("/api/v1/payment/verifyPayment").set(student.auth).send(body),
    ])

    expect(results.every((r) => r.status === 200)).toBe(true)

    const Course = (await import("../models/Course")).default
    const enrolled = (await Course.findById(course.id))!.studentsEnrolled.map(String)
    expect(enrolled.filter((id: string) => id === student.id)).toHaveLength(1)
  })
})

describe("razorpay webhook", () => {
  async function deliver(body: object, signature?: string) {
    const raw = JSON.stringify(body)
    return api()
      .post("/api/v1/payment/webhook")
      .set("x-razorpay-signature", signature ?? razorpayWebhookSignature(raw))
      .set("Content-Type", "application/json")
      .send(raw)
  }

  it("enrols from the webhook alone, with no browser callback", async () => {
    // The whole point of the webhook: a closed tab must not lose a purchase.
    const order = await startCheckout()
    const orderId = order.body.message.id as string

    const res = await deliver(capturedPaymentEvent(orderId))
    expect(res.status).toBe(200)

    const Course = (await import("../models/Course")).default
    expect((await Course.findById(course.id))!.studentsEnrolled.map(String)).toContain(student.id)
  })

  it("records the purchase-history row when the client never got to it", async () => {
    const order = await startCheckout()
    const orderId = order.body.message.id as string
    await deliver(capturedPaymentEvent(orderId))

    const Payment = (await import("../models/Payment")).default
    const payment = await Payment.findOne({ orderId })
    expect(payment).not.toBeNull()
    expect(payment!.amount).toBe(1000)
  })

  it("rejects an unsigned delivery", async () => {
    const order = await startCheckout()
    const res = await deliver(capturedPaymentEvent(order.body.message.id), "not-a-signature")
    expect(res.status).toBe(400)

    const Course = (await import("../models/Course")).default
    expect((await Course.findById(course.id))!.studentsEnrolled).toHaveLength(0)
  })

  it("treats a duplicate delivery as a no-op", async () => {
    const order = await startCheckout()
    const orderId = order.body.message.id as string
    const event = capturedPaymentEvent(orderId)

    await deliver(event)
    const second = await deliver(event)
    expect(second.status).toBe(200)

    const Course = (await import("../models/Course")).default
    const enrolled = (await Course.findById(course.id))!.studentsEnrolled.map(String)
    expect(enrolled.filter((id: string) => id === student.id)).toHaveLength(1)
  })

  it("does not double-enrol when the callback and the webhook both arrive", async () => {
    const order = await startCheckout()
    const orderId = order.body.message.id as string
    const paymentId = "pay_test_both"

    await Promise.all([
      api().post("/api/v1/payment/verifyPayment").set(student.auth).send({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: razorpayOrderSignature(orderId, paymentId),
      }),
      deliver(capturedPaymentEvent(orderId, paymentId)),
    ])

    const Course = (await import("../models/Course")).default
    const enrolled = (await Course.findById(course.id))!.studentsEnrolled.map(String)
    expect(enrolled.filter((id: string) => id === student.id)).toHaveLength(1)
  })

  it("acknowledges unrelated events without enrolling anyone", async () => {
    const res = await deliver({ event: "payment.failed", payload: {} })
    expect(res.status).toBe(200)
  })
})
