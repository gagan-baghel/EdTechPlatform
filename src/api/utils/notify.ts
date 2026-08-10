import type { Types } from "mongoose"

import { toErrorMessage } from "../lib/AppError"
import { emailLayout } from "../mail/templates/shared"
import { getEnv } from "../config/env"
import Notification from "../models/Notification"
import User from "../models/User"
import mailSender from "./mailSender"

export interface NotifyOptions {
  /** Stable key; also the name of the per-user email preference toggle. */
  type: string
  title: string
  body?: string
  /** Relative path, e.g. "/dashboard/my-learning". */
  link?: string | null
}

/**
 * One dispatcher for every notification type, in-app + email. Adding a
 * new notification anywhere in the app means calling this, not building a
 * new send path — the whole point of building this once (plan §4:
 * "adding a channel then costs nothing").
 *
 * Never throws: a notification failing must not fail the action that
 * triggered it (an enrollment, a payment, a certificate) — same principle
 * as every other best-effort side effect in this codebase.
 */
export async function notify(
  userId: Types.ObjectId | string,
  { type, title, body = "", link = null }: NotifyOptions
): Promise<void> {
  try {
    await Notification.create({ user: userId, type, title, body, link })
  } catch (error) {
    console.error(
      "notify: failed to create in-app notification",
      type,
      toErrorMessage(error)
    )
  }

  try {
    const user = await User.findById(userId).select(
      "email firstName notificationEmailPreferences"
    )
    if (!user) return

    const emailEnabled = user.notificationEmailPreferences?.get(type) ?? true
    if (!emailEnabled) return

    const baseUrl = getEnv().APP_BASE_URL
    const html = emailLayout({
      title,
      heading: title,
      // `body` is application-authored copy, not user input; `firstName` is
      // interpolated the same way every other template does it.
      bodyHtml: `<p>Hey ${user.firstName},</p><p>${body}</p>`,
      ...(link ? { cta: { href: `${baseUrl}${link}`, label: "View" } } : {}),
    })

    await mailSender(user.email, title, html)
  } catch (error) {
    console.error(
      "notify: failed to send notification email",
      type,
      toErrorMessage(error)
    )
  }
}
