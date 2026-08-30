/**
 * Stand-in for nodemailer.
 *
 * Records what would have been sent instead of opening an SMTP connection, so
 * tests can assert on the CONTENT of transactional mail — most importantly
 * that a password-reset email carries the raw token while only its hash is
 * stored.
 */

export interface SentMail {
  from?: string
  to: string
  subject: string
  html: string
}

export const sentMail: SentMail[] = []

/** Set to make the next send reject, for "mail is down" paths. */
export let mailFailure: Error | null = null
export function failNextMail(error: Error) {
  mailFailure = error
}

export function createTransport(_options: unknown) {
  return {
    sendMail: async (mail: SentMail) => {
      if (mailFailure) {
        const err = mailFailure
        mailFailure = null
        throw err
      }
      sentMail.push(mail)
      return { messageId: `fake-${sentMail.length}` }
    },
  }
}

export function resetMailFake() {
  sentMail.length = 0
  mailFailure = null
}

export default { createTransport }
