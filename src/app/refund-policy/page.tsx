import Link from "next/link"

import LegalPage from "../../ui/components/common/LegalPage"

export const metadata = {
  title: "Cancellation and refund policy",
  description: "When you can get your money back on IntelleCraft, and how.",
}

/*
 * Kept in step with the code: the 30-day / under-50% rule is
 * REFUND_DEADLINE_DAYS and REFUND_ELIGIBLE_COMPLETION_THRESHOLD in
 * controllers/Refund.ts; a refund removes the enrolment (same file); an unpaid
 * order is never charged (Payments.ts); cancelling a membership calls
 * Razorpay's subscription cancel (Subscription.ts).
 */
export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Cancellation and refund policy"
      summary="If a course isn't working for you, here is when you get your money back and how long it takes."
      updated="27 September 2026"
      sections={[
        {
          heading: "Our guarantee",
          body: (
            <p>
              If thirty days after enrolling you have completed less than half of a course, you are entitled to a full refund of what you
              paid for it. You can ask for a refund for any other reason too — we look at every request individually.
            </p>
          ),
        },
        {
          heading: "How to ask",
          body: (
            <p>
              <Link href="/contact">Contact us</Link> with the email address on your account and the course name. You can find the payment
              in Dashboard, then Purchase history.
            </p>
          ),
        },
        {
          heading: "How refunds are paid",
          body: (
            <p>
              Refunds go back to the original payment method through Razorpay. Once we issue a refund, your bank usually shows it within 5–7
              working days. When a course is refunded, your access to it ends.
            </p>
          ),
        },
        {
          heading: "Cancelled or failed payments",
          body: (
            <p>
              If you close checkout or a payment fails, you are not charged and no order is completed. If money left your account but you were
              not enrolled, contact us and we will enrol you or refund you.
            </p>
          ),
        },
        {
          heading: "Memberships",
          body: (
            <p>
              You can cancel a membership at any time from the membership page. Cancelling stops all future charges. If you were charged
              for a period you could not use, <Link href="/contact">contact us</Link> and we will review a refund.
            </p>
          ),
        },
      ]}
    />
  )
}
