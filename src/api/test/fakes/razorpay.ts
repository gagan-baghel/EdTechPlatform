/**
 * Stand-in for the Razorpay SDK.
 *
 * Only the network edge is faked. Every controller, guard, schema and database
 * write under test is the real one — what this replaces is the HTTP call to
 * Razorpay, which is the single thing that cannot run without an account.
 *
 * It deliberately mimics the shapes the real SDK returns (`order_...`,
 * `pay_...`, `rfnd_...`) so signature computation and id handling in the code
 * under test exercise realistic values.
 */

let counter = 0
const nextId = (prefix: string) => `${prefix}_${(counter += 1).toString().padStart(14, "0")}`

export interface RecordedCall {
  method: string
  args: unknown[]
}

/** Every call made through the fake, for assertions. Cleared by `resetRazorpayFake`. */
export const razorpayCalls: RecordedCall[] = []

/** Set to make the next call of that method reject, simulating a provider outage. */
export const razorpayFailures: Record<string, Error | undefined> = {}

function record(method: string, args: unknown[]) {
  razorpayCalls.push({ method, args })
  const failure = razorpayFailures[method]
  if (failure) {
    razorpayFailures[method] = undefined
    throw failure
  }
}

export default class Razorpay {
  constructor(_options: { key_id?: string; key_secret?: string }) {}

  orders = {
    create: async (opts: { amount: number; currency: string; receipt?: string }) => {
      record("orders.create", [opts])
      return { id: nextId("order"), amount: opts.amount, currency: opts.currency, receipt: opts.receipt, status: "created" }
    },
  }

  payments = {
    refund: async (paymentId: string, opts: { amount: number }) => {
      record("payments.refund", [paymentId, opts])
      return { id: nextId("rfnd"), payment_id: paymentId, amount: opts.amount, status: "processed" }
    },
  }

  plans = {
    create: async (opts: unknown) => {
      record("plans.create", [opts])
      return { id: nextId("plan") }
    },
  }

  subscriptions = {
    create: async (opts: unknown) => {
      record("subscriptions.create", [opts])
      return { id: nextId("sub"), status: "created" }
    },
    cancel: async (id: string) => {
      record("subscriptions.cancel", [id])
      return { id, status: "cancelled" }
    },
  }
}

export function resetRazorpayFake() {
  razorpayCalls.length = 0
  for (const key of Object.keys(razorpayFailures)) delete razorpayFailures[key]
}
