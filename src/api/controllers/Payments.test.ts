import crypto from "crypto"
import type { Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AuthedRequest } from "../lib/http"

const SECRET = "test_secret_key"
const USER_ID = "507f1f77bcf86cd799439011"
const OTHER_USER_ID = "507f1f77bcf86cd799439099"
const ORDER_ID = "order_123"
const PAYMENT_ID = "pay_123"

vi.mock("../config/env", () => ({
  getEnv: () => ({ RAZORPAY_SECRET: SECRET, WEBHOOK_SECRET: "wh" }),
}))

vi.mock("../models/Order", () => ({
  default: { findOne: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn() },
}))

// Everything below is downstream I/O that enrolment performs. Mocked so the
// test is about verifyPayment's decisions — signature, ownership, and who is
// allowed to settle — rather than about Mongo or SMTP.
vi.mock("../models/Course", () => ({ default: { findOneAndUpdate: vi.fn() } }))
vi.mock("../models/User", () => ({ default: { findByIdAndUpdate: vi.fn() } }))
vi.mock("../models/CourseProgress", () => ({
  default: { findOneAndUpdate: vi.fn(), findOne: vi.fn() },
}))
vi.mock("../models/Notification", () => ({ default: { create: vi.fn() } }))
vi.mock("../models/Coupon", () => ({ default: { updateOne: vi.fn() } }))
vi.mock("../models/Payment", () => ({
  default: { findOneAndUpdate: vi.fn(), findOne: vi.fn(), find: vi.fn() },
}))
vi.mock("../utils/mailSender", () => ({ default: vi.fn() }))
vi.mock("../utils/emitEvent", () => ({
  emitEvent: vi.fn(),
  EVENT_VERBS: new Proxy({}, { get: (_t, key) => String(key) }),
}))
vi.mock("./Affiliate", () => ({ creditReferralCommission: vi.fn() }))
vi.mock("./Coupon", () => ({ validateCouponForCart: vi.fn() }))

const { verifyPayment } = await import("./Payments")
const Order = (await import("../models/Order")).default
const Course = (await import("../models/Course")).default
const User = (await import("../models/User")).default
const CourseProgress = (await import("../models/CourseProgress")).default

const validSignature = () =>
  crypto.createHmac("sha256", SECRET).update(`${ORDER_ID}|${PAYMENT_ID}`).digest("hex")

function makeRes() {
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))
  return { res: { status, headersSent: false } as unknown as Response, status, json }
}

function makeReq(signature: string, userId = USER_ID) {
  return {
    user: { id: userId },
    body: {
      razorpay_order_id: ORDER_ID,
      razorpay_payment_id: PAYMENT_ID,
      razorpay_signature: signature,
    },
  } as unknown as AuthedRequest
}

const storedOrder = (userId = USER_ID) => ({
  orderId: ORDER_ID,
  user: { toString: () => userId },
  courses: ["507f1f77bcf86cd799439022"],
  amount: 50000,
  couponCode: null,
})

const claimedOrder = () => ({
  orderId: ORDER_ID,
  user: USER_ID,
  courses: ["507f1f77bcf86cd799439022"],
  amount: 50000,
  couponCode: null,
})

function mockSuccessfulEnrolment() {
  vi.mocked(Course.findOneAndUpdate).mockResolvedValue({ courseName: "Test Course" } as never)
  vi.mocked(CourseProgress.findOneAndUpdate).mockResolvedValue({ _id: "progress1" } as never)
  vi.mocked(User.findByIdAndUpdate).mockResolvedValue({
    email: "test@test.com",
    firstName: "Test",
  } as never)
}

describe("verifyPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects an invalid signature before touching the database", async () => {
    const { res, status, json } = makeRes()

    await verifyPayment(makeReq("invalid_signature"), res)

    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Payment verification failed." })
    )
    // The signature is the gate. Nothing may be read or settled without it.
    expect(Order.findOne).not.toHaveBeenCalled()
    expect(Order.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it("refuses to settle an order belonging to another account", async () => {
    // A valid signature is not authorisation: it proves Razorpay signed THIS
    // order, not that the caller is the person who placed it.
    vi.mocked(Order.findOne).mockResolvedValue(storedOrder(OTHER_USER_ID) as never)
    const { res, status, json } = makeRes()

    await verifyPayment(makeReq(validSignature()), res)

    expect(status).toHaveBeenCalledWith(403)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    )
    expect(Order.findOneAndUpdate).not.toHaveBeenCalled()
    expect(Course.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it("404s for an order that does not exist", async () => {
    vi.mocked(Order.findOne).mockResolvedValue(null as never)
    const { res, status } = makeRes()

    await verifyPayment(makeReq(validSignature()), res)

    expect(status).toHaveBeenCalledWith(404)
    expect(Order.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it("settles and enrols on a valid signature for the buyer's own order", async () => {
    vi.mocked(Order.findOne).mockResolvedValue(storedOrder() as never)
    vi.mocked(Order.findOneAndUpdate).mockResolvedValue(claimedOrder() as never)
    mockSuccessfulEnrolment()
    const { res, status, json } = makeRes()

    await verifyPayment(makeReq(validSignature()), res)

    expect(status).toHaveBeenCalledWith(200)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: "Payment verified." })
    )
    // Enrolment reads the course list from the STORED order, never the request.
    expect(Course.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "507f1f77bcf86cd799439022" },
      { $addToSet: { studentsEnrolled: USER_ID } },
      { new: true }
    )
  })

  it("claims the order atomically, only from `created`", async () => {
    vi.mocked(Order.findOne).mockResolvedValue(storedOrder() as never)
    vi.mocked(Order.findOneAndUpdate).mockResolvedValue(claimedOrder() as never)
    mockSuccessfulEnrolment()
    const { res } = makeRes()

    await verifyPayment(makeReq(validSignature()), res)

    // The `status: "created"` in the filter is what makes the client callback
    // and the webhook unable to both enrol for one purchase.
    expect(Order.findOneAndUpdate).toHaveBeenCalledWith(
      { orderId: ORDER_ID, status: "created" },
      { $set: { status: "paid", paymentId: PAYMENT_ID } },
      { new: true }
    )
  })

  it("is idempotent: a replay of an already-settled order enrols nothing", async () => {
    vi.mocked(Order.findOne).mockResolvedValue(storedOrder() as never)
    // Losing the claim (webhook got there first) returns null.
    vi.mocked(Order.findOneAndUpdate).mockResolvedValue(null as never)
    const { res, status, json } = makeRes()

    await verifyPayment(makeReq(validSignature()), res)

    expect(status).toHaveBeenCalledWith(200)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: "Payment already verified." })
    )
    expect(Course.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it("releases the claim when enrolment fails, so a retry can settle it", async () => {
    vi.mocked(Order.findOne).mockResolvedValue(storedOrder() as never)
    vi.mocked(Order.findOneAndUpdate).mockResolvedValue(claimedOrder() as never)
    // Course vanished between checkout and settlement.
    vi.mocked(Course.findOneAndUpdate).mockResolvedValue(null as never)
    const { res, status } = makeRes()

    await verifyPayment(makeReq(validSignature()), res)

    // Without the release the order is stuck "paid" with nobody enrolled and
    // neither the client retry nor the webhook can ever fix it.
    expect(Order.updateOne).toHaveBeenCalledWith(
      { orderId: ORDER_ID, status: "paid" },
      { $set: { status: "created" } }
    )
    expect(status).toHaveBeenCalledWith(500)
  })

  it("rejects a malformed body without a database read", async () => {
    const { res, status } = makeRes()
    const req = { user: { id: USER_ID }, body: {} } as unknown as AuthedRequest

    await verifyPayment(req, res)

    expect(status).toHaveBeenCalledWith(400)
    expect(Order.findOne).not.toHaveBeenCalled()
  })
})
