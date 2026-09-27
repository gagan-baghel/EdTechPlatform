import Link from "next/link"

import LegalPage from "../../ui/components/common/LegalPage"

export const metadata = {
  title: "Terms of use",
  description: "The terms for learning and teaching on IntelleCraft.",
}

/*
 * Kept in step with the code: quiz attempt cap (Quiz.ts MAX_ATTEMPTS_PER_QUIZ),
 * certificate rule (Certificate.ts), default platform fee (Payout.ts, 30%),
 * takedowns never removing enrolled access (Admin.ts setCourseTakedown),
 * suspension (Admin.ts setUserActive).
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      summary="The agreement between you and IntelleCraft when you learn or teach here. Plain language, and nothing here overrides the rights the law gives you."
      updated="27 September 2026"
      sections={[
        {
          heading: "Your account",
          body: (
            <p>
              Give accurate details, keep your password to yourself, and keep your account to yourself — one person per account. You are
              responsible for what happens under it. If you are not old enough to agree to these terms where you live, a parent or guardian
              must agree for you.
            </p>
          ),
        },
        {
          heading: "Courses you buy",
          body: (
            <>
              <p>
                Buying a course gives you a personal, non-transferable licence to watch and use it for your own learning. You may not copy,
                resell, share or publish course material.
              </p>
              <p>
                If a course is later removed from the catalogue, learners who already enrolled keep access to it. Prices are in Indian
                rupees and payments are processed by Razorpay.
              </p>
            </>
          ),
        },
        {
          heading: "Refunds",
          body: (
            <p>
              Refunds follow our <Link href="/refund-policy">cancellation and refund policy</Link>.
            </p>
          ),
        },
        {
          heading: "Quizzes and certificates",
          body: (
            <p>
              Each quiz allows up to ten attempts and is graded on our servers. A certificate is issued when you complete every lecture in a
              course and pass every course-level quiz. It records that you completed the course on IntelleCraft; it is not a degree or an
              accredited qualification unless the course says otherwise.
            </p>
          ),
        },
        {
          heading: "Teaching on IntelleCraft",
          body: (
            <>
              <p>
                You keep ownership of what you upload, and you give IntelleCraft permission to host, stream, sell and promote it on the
                platform. You confirm you have the rights to everything you upload.
              </p>
              <p>
                We keep a platform fee from each sale — 30% unless we have agreed a different rate with you, which your payout settings show.
                Payouts go to your verified bank account once your KYC details are approved.
              </p>
            </>
          ),
        },
        {
          heading: "AI features",
          body: (
            <p>
              The tutor, assistant and copilot generate answers automatically and can be wrong. Use them to help you learn, not as the final
              word. They are limited to a number of requests per person per day.
            </p>
          ),
        },
        {
          heading: "Acceptable use",
          body: (
            <ul>
              <li>No sharing accounts, reselling access or recording and redistributing courses.</li>
              <li>No attempting to get around quiz grading, payments, or anyone&apos;s access controls.</li>
              <li>No uploading or posting anything unlawful, infringing, abusive or misleading.</li>
              <li>No scraping or overloading the service.</li>
            </ul>
          ),
        },
        {
          heading: "Suspension",
          body: (
            <p>
              We may suspend an account that breaks these terms. Suspension signs the account out everywhere. If you think we got it wrong,{" "}
              <Link href="/contact">contact us</Link>.
            </p>
          ),
        },
        {
          heading: "Liability",
          body: (
            <p>
              We work to keep IntelleCraft available and correct, but we provide it as it is. To the extent the law allows, we are not liable
              for indirect losses, and our total liability to you is limited to what you paid us in the twelve months before the claim.
            </p>
          ),
        },
        {
          heading: "Changes and governing law",
          body: (
            <p>
              We may update these terms; the date above shows when. If a change matters, we will tell you before it applies. These terms are
              governed by the laws of India.
            </p>
          ),
        },
      ]}
    />
  )
}
