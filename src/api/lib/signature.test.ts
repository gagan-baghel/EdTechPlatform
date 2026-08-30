import crypto from "crypto"
import { describe, expect, it } from "vitest"

import { verifyHmacSignature, verifyRazorpayOrderSignature } from "./signature"

const SECRET = "test_secret_key"

const sign = (payload: string, secret = SECRET) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex")

describe("verifyHmacSignature", () => {
  it("accepts a signature computed with the same secret", () => {
    const payload = '{"event":"payment.captured"}'
    expect(
      verifyHmacSignature({ payload, signature: sign(payload), secret: SECRET })
    ).toBe(true)
  })

  it("accepts a Buffer payload, byte for byte", () => {
    // The webhook verifies over raw bytes, so this is the shape that matters
    // in production — a re-serialised body would produce a different digest.
    const payload = Buffer.from('{"a":1,  "b":2}', "utf8")
    expect(
      verifyHmacSignature({
        payload,
        signature: crypto.createHmac("sha256", SECRET).update(payload).digest("hex"),
        secret: SECRET,
      })
    ).toBe(true)
  })

  it("rejects a signature made with a different secret", () => {
    const payload = "abc"
    expect(
      verifyHmacSignature({
        payload,
        signature: sign(payload, "not_the_secret"),
        secret: SECRET,
      })
    ).toBe(false)
  })

  it("rejects a tampered payload", () => {
    const signature = sign("amount=100")
    expect(
      verifyHmacSignature({ payload: "amount=1", signature, secret: SECRET })
    ).toBe(false)
  })

  it("rejects a missing or empty signature rather than throwing", () => {
    expect(verifyHmacSignature({ payload: "x", signature: undefined, secret: SECRET })).toBe(false)
    expect(verifyHmacSignature({ payload: "x", signature: null, secret: SECRET })).toBe(false)
    expect(verifyHmacSignature({ payload: "x", signature: "", secret: SECRET })).toBe(false)
  })

  it("rejects a signature of the wrong length without throwing", () => {
    // timingSafeEqual throws on a length mismatch; the guard has to come first
    // or a short signature is a 500 instead of a rejected payment.
    expect(verifyHmacSignature({ payload: "x", signature: "abc", secret: SECRET })).toBe(false)
  })

  it("fails closed when no secret is configured", () => {
    const payload = "x"
    expect(verifyHmacSignature({ payload, signature: sign(payload, ""), secret: "" })).toBe(false)
  })
})

describe("verifyRazorpayOrderSignature", () => {
  const orderId = "order_123"
  const paymentId = "pay_123"

  it("accepts the documented `order_id|payment_id` payload", () => {
    expect(
      verifyRazorpayOrderSignature({
        orderId,
        paymentId,
        signature: sign(`${orderId}|${paymentId}`),
        secret: SECRET,
      })
    ).toBe(true)
  })

  it("rejects a signature bound to a different order", () => {
    // Replaying another purchase's signature against this order must not pass.
    expect(
      verifyRazorpayOrderSignature({
        orderId,
        paymentId,
        signature: sign(`order_999|${paymentId}`),
        secret: SECRET,
      })
    ).toBe(false)
  })

  it("rejects a signature bound to a different payment", () => {
    expect(
      verifyRazorpayOrderSignature({
        orderId,
        paymentId,
        signature: sign(`${orderId}|pay_999`),
        secret: SECRET,
      })
    ).toBe(false)
  })

  it("is not fooled by moving the separator", () => {
    // `order|payment` must not verify against `orderpay|ment`-style splits.
    expect(
      verifyRazorpayOrderSignature({
        orderId: "order_12",
        paymentId: "3|pay_123",
        signature: sign(`${orderId}|${paymentId}`),
        secret: SECRET,
      })
    ).toBe(false)
  })
})
