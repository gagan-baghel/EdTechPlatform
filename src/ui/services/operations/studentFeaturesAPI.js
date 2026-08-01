import { toast } from "react-hot-toast"
import { studentEndpoints } from "../apis"
import { apiConnector } from "../apiconnector"
import { setPaymentLoading } from "../../slices/courseSlice"
import { resetCart } from "../../slices/cartSlice"

const {
  COURSE_PAYMENT_API,
  COURSE_VERIFY_API,
  SEND_PAYMENT_SUCCESS_EMAIL_API,
  CREATE_PAYMENT_ENTRY,
} = studentEndpoints

const RAZORPAY_PUBLIC_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js"

let razorpayScriptPromise = null

function loadScript(src) {
  if (typeof window === "undefined") return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  if (razorpayScriptPromise) return razorpayScriptPromise

  razorpayScriptPromise = new Promise((resolve) => {
    const existingScript = document.querySelector(`script[src="${src}"]`)

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true })
      existingScript.addEventListener("error", () => resolve(false), { once: true })
      return
    }

    const script = document.createElement("script")
    script.src = src
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  }).then((loaded) => {
    // Only cache a successful load, so a transient failure can be retried.
    if (!loaded) razorpayScriptPromise = null
    return loaded
  })

  return razorpayScriptPromise
}

export async function buyCourse(token, courses, userDetails, navigate, dispatch) {
  if (!RAZORPAY_PUBLIC_KEY) {
    toast.error("Payments are not configured. Please contact support.")
    return
  }

  if (!courses?.length) {
    toast.error("Your cart is empty.")
    return
  }

  const toastId = toast.loading("Starting checkout...")

  try {
    const scriptLoaded = await loadScript(RAZORPAY_SCRIPT)

    if (!scriptLoaded) {
      toast.error("Could not reach the payment provider. Check your connection.")
      return
    }

    const orderResponse = await apiConnector(
      "POST",
      COURSE_PAYMENT_API,
      { courses },
      { Authorization: `Bearer ${token}` }
    )

    if (!orderResponse.data.success) {
      throw new Error(orderResponse.data.message)
    }

    const order = orderResponse.data.message

    const paymentObject = new window.Razorpay({
      key: RAZORPAY_PUBLIC_KEY,
      currency: order.currency,
      amount: `${order.amount}`,
      order_id: order.id,
      name: "IntelleCraft",
      description: "Course purchase",
      image: "/logo.png",
      prefill: {
        name: `${userDetails?.firstName ?? ""} ${userDetails?.lastName ?? ""}`.trim(),
        email: userDetails?.email ?? "",
      },
      handler: function (response) {
        // Enrolment is authoritative and must complete first.
        // The server derives courses and amount from the stored order.
        verifyPayment(response, token, navigate, dispatch)
      },
      modal: {
        ondismiss: function () {
          toast("Checkout cancelled. Your cart is saved.", { icon: "🛒" })
        },
      },
    })

    paymentObject.open()

    paymentObject.on("payment.failed", function () {
      toast.error("Payment failed. You have not been charged for this attempt.")
    })
  } catch (error) {
    toast.error(error?.message || "Could not start checkout. Please try again.")
  } finally {
    toast.dismiss(toastId)
  }
}

// Receipt email and history row are best-effort follow-ups; they never block access.
async function recordPurchase(response, token) {
  const payload = {
    orderId: response.razorpay_order_id,
    paymentId: response.razorpay_payment_id,
  }
  const headers = { Authorization: `Bearer ${token}` }

  await Promise.allSettled([
    apiConnector("POST", CREATE_PAYMENT_ENTRY, payload, headers),
    apiConnector("POST", SEND_PAYMENT_SUCCESS_EMAIL_API, payload, headers),
  ])
}

async function verifyPayment(response, token, navigate, dispatch) {
  const toastId = toast.loading("Confirming your payment...")
  dispatch(setPaymentLoading(true))

  try {
    const result = await apiConnector(
      "POST",
      COURSE_VERIFY_API,
      {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      },
      { Authorization: `Bearer ${token}` }
    )

    if (result.data.success !== true) {
      throw new Error(result.data.message)
    }

    await recordPurchase(response, token)

    toast.success("Payment confirmed. You're enrolled!")
    dispatch(resetCart())
    navigate("/dashboard/enrolled-courses")
  } catch (error) {
    toast.error(
      error?.response?.data?.message ||
        "We could not confirm your payment. If you were charged, contact support with your order id."
    )
  } finally {
    toast.dismiss(toastId)
    dispatch(setPaymentLoading(false))
  }
}
