import Razorpay from "razorpay"

import { getEnv } from "./env"

let client: Razorpay | null = null

/**
 * Lazily constructed. The previous module built the client at import time
 * from `process.env`, which meant an unset key produced a client holding
 * `undefined` credentials that only failed — opaquely — on the first real
 * charge. Constructing on first use lets `getEnv()` name the missing
 * variable instead.
 */
export function getRazorpay(): Razorpay {
  if (!client) {
    const env = getEnv()
    client = new Razorpay({
      key_id: env.RAZORPAY_KEY,
      key_secret: env.RAZORPAY_SECRET,
    })
  }
  return client
}
