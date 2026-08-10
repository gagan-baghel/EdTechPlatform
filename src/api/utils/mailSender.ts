import nodeMailer, { type SentMessageInfo } from "nodemailer"

import { getEnv } from "../config/env"
import { AppError } from "../lib/AppError"

/**
 * `to`, `title` and `body` all originate from application code or already-
 * validated user data. The one thing worth guarding here is header
 * injection: a newline in the subject line would let a caller append
 * arbitrary SMTP headers. Nodemailer encodes subjects, but stripping CR/LF
 * costs nothing and does not depend on that staying true.
 */
const stripNewlines = (value: string): string => value.replace(/[\r\n]+/g, " ")

const mailSender = async (
  email: string,
  title: string,
  body: string
): Promise<SentMessageInfo> => {
  const { MAIL_HOST, MAIL_USER, MAIL_PASS } = getEnv()
  if (!MAIL_HOST || !MAIL_USER || !MAIL_PASS) {
    throw AppError.upstream("Email is not configured on this deployment.")
  }

  const transporter = nodeMailer.createTransport({
    host: MAIL_HOST,
    auth: {
      user: MAIL_USER,
      pass: MAIL_PASS,
    },
  })

  return transporter.sendMail({
    from: MAIL_USER,
    to: stripNewlines(email),
    subject: stripNewlines(title),
    html: body,
  })
}

export default mailSender
