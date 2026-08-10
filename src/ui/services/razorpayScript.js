// Shared by one-time checkout (studentFeaturesAPI.js) and subscription
// checkout (subscriptionAPI.js) — same script, same load-once behavior.
const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js"

let razorpayScriptPromise = null

export function loadRazorpayScript() {
  if (typeof window === "undefined") return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  if (razorpayScriptPromise) return razorpayScriptPromise

  razorpayScriptPromise = new Promise((resolve) => {
    const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`)

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true })
      existingScript.addEventListener("error", () => resolve(false), { once: true })
      return
    }

    const script = document.createElement("script")
    script.src = RAZORPAY_SCRIPT
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
