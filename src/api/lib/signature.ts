import crypto from "crypto"

/**
 * HMAC-SHA256 signature verification for Razorpay callbacks and webhooks.
 *
 * Extracted because the identical eight lines existed twice in Payments.ts —
 * once for the browser callback, once for the webhook — and a security check
 * that is copy-pasted is a security check that will eventually be fixed in
 * only one of its copies. It is a pure function of its inputs, which is also
 * what makes it directly testable without a database.
 */
export function verifyHmacSignature({
  payload,
  signature,
  secret,
}: {
  /** The exact bytes the signature was computed over. */
  payload: string | Buffer
  /** The hex signature supplied by the caller. */
  signature: string | undefined | null
  secret: string
}): boolean {
  if (!secret || !signature) return false

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  const expectedBuf = Buffer.from(expected, "utf8")
  const receivedBuf = Buffer.from(signature, "utf8")

  // `timingSafeEqual` throws on a length mismatch, so the length check is
  // both required and safe to do non-constant-time: the length of a hex
  // digest is public.
  return (
    expectedBuf.length === receivedBuf.length &&
    crypto.timingSafeEqual(expectedBuf, receivedBuf)
  )
}

/** Razorpay signs the browser callback over `order_id|payment_id`. */
export function verifyRazorpayOrderSignature({
  orderId,
  paymentId,
  signature,
  secret,
}: {
  orderId: string
  paymentId: string
  signature: string | undefined | null
  secret: string
}): boolean {
  return verifyHmacSignature({
    payload: `${orderId}|${paymentId}`,
    signature,
    secret,
  })
}
