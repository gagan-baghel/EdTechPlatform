const Notification = require("../models/Notification")
const User = require("../models/User")
const mailSender = require("./mailSender")
const { emailLayout } = require("../mail/templates/shared")

/**
 * One dispatcher for every notification type, in-app + email. Adding a
 * new notification anywhere in the app means calling this, not building a
 * new send path — the whole point of building this once (plan §4:
 * "adding a channel then costs nothing").
 *
 * Never throws: a notification failing must not fail the action that
 * triggered it (an enrollment, a payment, a certificate) — same principle
 * as every other best-effort side effect in this codebase (enrolment
 * emails in Payments.js, event emission in emitEvent.js).
 *
 * @param {string} userId
 * @param {object} options
 * @param {string} options.type - stable key, also the preference toggle name
 * @param {string} options.title
 * @param {string} [options.body]
 * @param {string} [options.link] - relative path, e.g. "/dashboard/my-learning"
 */
async function notify(userId, { type, title, body = "", link = null }) {
  try {
    await Notification.create({ user: userId, type, title, body, link })
  } catch (error) {
    console.error("notify: failed to create in-app notification", type, error.message)
  }

  try {
    const user = await User.findById(userId).select("email firstName notificationEmailPreferences")
    if (!user) return

    const emailEnabled = user.notificationEmailPreferences?.get?.(type) ?? true
    if (!emailEnabled) return

    const baseUrl = process.env.APP_BASE_URL || ""
    const html = emailLayout({
      title,
      heading: title,
      bodyHtml: `<p>Hey ${user.firstName},</p><p>${body}</p>`,
      cta: link ? { href: `${baseUrl}${link}`, label: "View" } : undefined,
    })

    await mailSender(user.email, title, html)
  } catch (error) {
    console.error("notify: failed to send notification email", type, error.message)
  }
}

module.exports = { notify }
