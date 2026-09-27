import { Link } from "@/ui/lib/router"

/**
 * The line under every "Buy" button. Payment providers (Razorpay included)
 * expect the terms and refund policy to be reachable at the point of sale.
 */
export default function PurchaseTerms() {
  return (
    <p className="mt-3 text-xs leading-relaxed text-richblack-300">
      By buying you agree to our{" "}
      <Link to="/terms" className="underline hover:text-richblack-5">
        Terms
      </Link>{" "}
      and{" "}
      <Link to="/refund-policy" className="underline hover:text-richblack-5">
        Refund policy
      </Link>
      . Less than half done after 30 days? You get your money back.
    </p>
  )
}
