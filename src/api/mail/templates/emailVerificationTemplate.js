const { emailLayout } = require("./shared")

const otpTemplate = (otp) => {
  return emailLayout({
    title: "OTP Verification Email",
    heading: "OTP Verification Email",
    bodyHtml: `
      <p>Dear User,</p>
      <p>Thank you for registering with IntelleCraft. To complete your registration, please use the following OTP (One-Time Password) to verify your account:</p>
      <h2 class="highlight">${otp}</h2>
      <p>This OTP is valid for 5 minutes. If you did not request this verification, please disregard this email. Once your account is verified, you will have access to our platform and its features.</p>
    `,
  })
}

module.exports = otpTemplate
