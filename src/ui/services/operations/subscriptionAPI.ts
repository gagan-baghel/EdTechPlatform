import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { subscriptionEndpoints } from "../apis"
import { loadRazorpayScript } from "../razorpayScript"

const { LIST_PLANS_API, CREATE_SUBSCRIPTION_API, MY_SUBSCRIPTION_API, CANCEL_SUBSCRIPTION_API } =
  subscriptionEndpoints

const RAZORPAY_PUBLIC_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY

export async function fetchPlans() {
  try {
    const response = await apiConnector("GET", LIST_PLANS_API)
    return response.data?.success ? response.data.data : []
  } catch {
    toast.error("Could not load plans")
    return []
  }
}

export async function fetchMySubscription(token: string) {
  try {
    const response = await apiConnector("GET", MY_SUBSCRIPTION_API, null, {
      Authorization: `Bearer ${token}`,
    })
    return response.data?.success ? response.data.data : null
  } catch {
    return null
  }
}

/**
 * Same shape as buyCourse in studentFeaturesAPI.js, but Razorpay checkout
 * takes subscription_id instead of order_id for recurring billing.
 * Activation itself happens via the subscription.activated webhook (see
 * Subscription.js / Payments.js) — this just starts checkout and reports
 * that it's processing, the same "payment succeeded, grant may lag by a
 * moment" pattern the one-time purchase flow already uses.
 */
export async function subscribeToPlan(token: string, planId: string, userDetails: Record<string, unknown>, onSettled: () => void) {
  if (!RAZORPAY_PUBLIC_KEY) {
    toast.error("Payments are not configured. Please contact support.")
    return
  }

  const toastId = toast.loading("Starting checkout...")
  try {
    const scriptLoaded = await loadRazorpayScript()
    if (!scriptLoaded) {
      toast.error("Could not reach the payment provider. Check your connection.")
      return
    }

    const response = await apiConnector(
      "POST",
      CREATE_SUBSCRIPTION_API,
      { planId },
      { Authorization: `Bearer ${token}` }
    )
    if (!response.data.success) {
      throw new Error(response.data.message)
    }

    const data = response.data.data as { subscriptionId?: string } | undefined
    const subscriptionId = data?.subscriptionId
    if (!subscriptionId) throw new Error("Invalid subscription response")

    const paymentObject = new window.Razorpay!({
      key: RAZORPAY_PUBLIC_KEY,
      subscription_id: subscriptionId,
      name: "IntelleCraft",
      description: "All-access subscription",
      image: "/logo.png",
      prefill: {
        name: `${userDetails?.firstName ?? ""} ${userDetails?.lastName ?? ""}`.trim(),
        email: userDetails?.email ?? "",
      },
      handler: function () {
        toast.success("Subscription started! Access unlocks as soon as the first payment settles.")
        onSettled?.()
      },
      modal: {
        ondismiss: function () {
          toast("Checkout cancelled.", { icon: "🛒" })
        },
      },
    })

    paymentObject.open()
    paymentObject.on("payment.failed", function () {
      toast.error("Payment failed. You have not been charged.")
    })
  } catch (error) {
    toast.error((error as Error)?.message || "Could not start checkout.")
  } finally {
    toast.dismiss(toastId)
  }
}

export async function cancelMySubscription(token: string) {
  try {
    const response = await apiConnector("POST", CANCEL_SUBSCRIPTION_API, null, {
      Authorization: `Bearer ${token}`,
    })
    if (response.data.success) {
      toast.success("Subscription cancelled")
      return true
    }
    return false
  } catch {
    toast.error("Could not cancel subscription")
    return false
  }
}
