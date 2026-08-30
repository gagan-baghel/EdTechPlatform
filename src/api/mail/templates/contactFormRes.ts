import { emailLayout, escapeHtml } from "./shared"

export interface ContactSubmission {
  email: string
  firstname: string
  lastname: string
  message: string
  phoneNo: string
  countrycode: string
}

/** Acknowledgement sent to whoever submitted the form. */
export const contactUsEmail = ({
  email,
  firstname,
  lastname,
  message,
  phoneNo,
  countrycode,
}: ContactSubmission): string =>
  emailLayout({
    title: "Contact Form Confirmation",
    heading: "We received your message",
    // Every field here is user-submitted through a public, unauthenticated
    // form — escaped so a submission can't inject markup into the email.
    bodyHtml: `
      <p>Dear ${escapeHtml(firstname)} ${escapeHtml(lastname)},</p>
      <p>Thank you for contacting us. We have received your message and will respond as soon as possible.</p>
      <p>Here are the details you provided:</p>
      <p>Name: ${escapeHtml(firstname)} ${escapeHtml(lastname)}</p>
      <p>Email: ${escapeHtml(email)}</p>
      <p>Phone Number: ${escapeHtml(`${countrycode} ${phoneNo}`.trim())}</p>
      <p>Message: ${escapeHtml(message)}</p>
    `,
  })

/**
 * The enquiry itself, delivered to the support inbox. This is the email that
 * makes the contact form a contact form rather than a no-op.
 */
export const contactUsNotification = ({
  email,
  firstname,
  lastname,
  message,
  phoneNo,
  countrycode,
}: ContactSubmission): string =>
  emailLayout({
    title: "New contact form submission",
    heading: "New contact form submission",
    bodyHtml: `
      <p>From: ${escapeHtml(firstname)} ${escapeHtml(lastname)} &lt;${escapeHtml(email)}&gt;</p>
      <p>Phone: ${escapeHtml(`${countrycode} ${phoneNo}`.trim()) || "—"}</p>
      <p>Message:</p>
      <p>${escapeHtml(message)}</p>
    `,
  })
