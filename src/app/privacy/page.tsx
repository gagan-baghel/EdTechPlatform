import Link from "next/link"

import LegalPage from "../../ui/components/common/LegalPage"

export const metadata = {
  title: "Privacy policy",
  description: "What IntelleCraft collects, why, who processes it, and how to export or delete it.",
}

/*
 * Kept in step with the code: collected fields are the User, Profile,
 * CourseProgress, QuizAttempt, Note, Question, Event, Session and AIInteraction
 * models; processors are the providers in src/api/config and src/api/utils/ai.ts;
 * export and deletion are exportMyData / deleteAccount in controllers/Profile.ts.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      summary="What we collect to run your account and your courses, who helps us process it, and how you can take it with you or delete it."
      updated="27 September 2026"
      sections={[
        {
          heading: "What we collect",
          body: (
            <ul>
              <li>Your account: name, email address, and your password — stored only as a one-way hash.</li>
              <li>Your profile, if you fill it in: photo, gender, date of birth, phone number, a short bio, your learning goal and your preferences (language, theme, timezone, playback).</li>
              <li>Your learning: which lectures you watched and where you stopped, notes you take, questions you ask under lectures, your quiz answers and scores, reviews you write, and certificates you earn.</li>
              <li>Purchases: what you bought, the amount, and the payment reference from Razorpay. Your card, UPI or bank details go to Razorpay and never reach our servers.</li>
              <li>Instructors: bank account (encrypted at rest), IFSC and PAN, to pay you and meet KYC requirements.</li>
              <li>Security records: for each signed-in device, its browser and IP address and when it was last used, so you can see and end your sessions.</li>
              <li>Usage events, such as course views, searches and lecture progress, to run your streak, scorecard and our analytics.</li>
            </ul>
          ),
        },
        {
          heading: "How we use it",
          body: (
            <ul>
              <li>To give you access to what you bought and remember your progress.</li>
              <li>To grade quizzes, compute your scorecard and class position, and issue certificates.</li>
              <li>To send the emails you expect — sign-up codes, receipts, password changes — and the notifications you have not turned off.</li>
              <li>To show instructors how their courses are doing. Instructors see enrolled learners&apos; names and progress; they do not see your email address or payment details.</li>
              <li>To keep the platform secure and to fix problems.</li>
            </ul>
          ),
        },
        {
          heading: "Leaderboards",
          body: (
            <p>
              Classmates in a course may see your first name and last initial on that course&apos;s leaderboard. You can hide your name in
              Settings, under Privacy &amp; data; your own position is still shown to you.
            </p>
          ),
        },
        {
          heading: "AI features",
          body: (
            <p>
              When you use the lecture tutor, the help assistant or the instructor copilot, your question and the relevant course material
              are sent to an AI provider (Anthropic) to generate the answer, and lecture audio is sent to OpenAI to produce transcripts. We
              keep a record of each AI request and its answer so that a wrong answer can be investigated. Answers can be mistaken — check
              anything important.
            </p>
          ),
        },
        {
          heading: "Who processes your data",
          body: (
            <ul>
              <li>Razorpay — payments and refunds.</li>
              <li>Cloudinary — storing and streaming videos and images.</li>
              <li>Anthropic and OpenAI — the AI features described above.</li>
              <li>Our email provider — transactional email.</li>
              <li>Our hosting and database providers — running the service.</li>
            </ul>
          ),
        },
        {
          heading: "Cookies and local storage",
          body: (
            <p>
              We use one sign-in cookie, which expires after 24 hours. Your browser&apos;s local storage keeps your sign-in, your cart, and
              preferences such as theme, language and accessibility settings; signing out clears the sign-in. We do not use advertising or third-party tracking cookies.
              Razorpay&apos;s checkout may set its own cookies while you pay.
            </p>
          ),
        },
        {
          heading: "Your choices and rights",
          body: (
            <ul>
              <li>Download a copy of your data at any time: Settings, then Privacy &amp; data, then Export my data.</li>
              <li>See every signed-in device and sign any of them out: Settings, then Security.</li>
              <li>Choose which emails you receive: Settings, then Notifications.</li>
              <li>
                Delete your account: Settings, then Delete account. Your profile, progress and sessions are removed; records of payments
                are kept as our accounts require.
              </li>
            </ul>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions about your data? <Link href="/contact">Contact us</Link>.
            </p>
          ),
        },
      ]}
    />
  )
}
