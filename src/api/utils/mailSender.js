const nodeMailer = require("nodemailer")
require("dotenv").config()

const mailSender = async (email, title, body) => {
  try {
    const { MAIL_HOST, MAIL_USER, MAIL_PASS } = process.env
    if (!MAIL_HOST || !MAIL_USER || !MAIL_PASS) {
      throw new Error("Missing MAIL_* environment variables")
    }

    const transporter = nodeMailer.createTransport({
      host: MAIL_HOST,
      auth: {
        user: MAIL_USER,
        pass: MAIL_PASS,
      },
    })

    const info = await transporter.sendMail({
      from: MAIL_USER,
      to: email,
      subject: title,
      html: `<h1>${body}</h1>`,
    })
    return info
  } catch (error) {
    console.log("nodemail config error from mailsender", error)
    throw error
  }
}

module.exports = mailSender
