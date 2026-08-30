import { z } from "zod"
import type { Request, Response } from "express"

import { getEnv } from "../config/env"
import { fail, parseOrThrow } from "../lib/respond"
import { email as emailSchema, text } from "../lib/schemas"
import { contactUsEmail, contactUsNotification } from "../mail/templates/contactFormRes"
import mailSender from "../utils/mailSender"

/**
 * Public contact form.
 *
 * Two things were wrong here and they compounded:
 *
 *  1. The only email it sent was an acknowledgement to the address in the
 *     request body. Nothing was ever delivered to the platform, so every
 *     message submitted through the contact page was silently discarded —
 *     the form looked like it worked and did nothing.
 *
 *  2. That made it an open relay: an unauthenticated caller could have the
 *     platform's own mail server deliver attacker-authored text, from the
 *     platform's address, to any address they chose. The enquiry now goes to
 *     the support inbox first (that is the point of the form), and the
 *     acknowledgement is best-effort on top.
 *
 * Rate limiting is applied at the route (routes/Contact.ts).
 */

const ContactSchema = z.object({
  email: emailSchema(),
  firstname: text({ max: 100, label: "First name" }),
  lastname: text({ max: 100, label: "Last name" }).optional().default(""),
  message: text({ max: 5000, label: "Message" }),
  phoneNo: z.string().trim().max(30).optional().default(""),
  countrycode: z.string().trim().max(8).optional().default(""),
})

export const contactUsController = async (req: Request, res: Response) => {
  try {
    const submission = parseOrThrow(ContactSchema, req.body)

    // Delivering the enquiry is the operation. If this fails the caller must
    // be told, because nobody has their message.
    await mailSender(
      getEnv().SUPPORT_EMAIL,
      `Contact form: ${submission.firstname} ${submission.lastname}`.trim(),
      contactUsNotification(submission)
    )

    // Acknowledgement to the submitter. Best-effort: their message is already
    // safely delivered, and a bounced confirmation is not a failed submission.
    try {
      await mailSender(
        submission.email,
        "We received your message",
        contactUsEmail(submission)
      )
    } catch (error) {
      console.error("Contact form acknowledgement email failed", error)
    }

    return res.status(200).json({
      success: true,
      message: "Thanks — your message is on its way to our team.",
    })
  } catch (error) {
    return fail(res, error, "contactUs", "We could not send your message. Please try again.")
  }
}
