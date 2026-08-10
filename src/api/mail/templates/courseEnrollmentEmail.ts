import { emailLayout, escapeHtml, getEmailBaseUrl } from "./shared"

export const courseEnrollmentEmail = (courseName: string, name: string): string => {
  return emailLayout({
    title: "Course Registration Confirmation",
    heading: "Course Registration Confirmation",
    bodyHtml: `
      <p>Dear ${escapeHtml(name)},</p>
      <p>You have successfully registered for the course <span class="highlight">"${escapeHtml(courseName)}"</span>. We are excited to have you as a participant!</p>
      <p>Please log in to your learning dashboard to access the course materials and start your learning journey.</p>
    `,
    cta: { href: `${getEmailBaseUrl()}/dashboard`, label: "Go to Dashboard" },
  })
}
