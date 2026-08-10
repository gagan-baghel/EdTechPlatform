import { emailLayout, escapeHtml } from "./shared"

export const paymentSuccessEmail = (
  name: string,
  amount: number,
  orderId: string,
  paymentId: string
): string => {
  return emailLayout({
    title: "Payment Confirmation",
    heading: "Course Payment Confirmation",
    bodyHtml: `
      <p>Dear ${escapeHtml(name)},</p>
      <p>We have received a payment of <span class="highlight">₹${escapeHtml(amount)}</span>.</p>
      <p>Your Payment ID is <b>${escapeHtml(paymentId)}</b></p>
      <p>Your Order ID is <b>${escapeHtml(orderId)}</b></p>
    `,
  })
}
