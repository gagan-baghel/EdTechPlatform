import type { Request, Response } from "express"
import { contactUsEmail } from "../mail/templates/contactFormRes"
import mailSender from "../utils/mailSender"

export const contactUsController = async (req: Request, res: Response) => {
  const { email, firstname, lastname, message, phoneNo, countrycode } = req.body
  if (!email || !firstname || !message) {
    return res.status(400).json({
      success: false,
      message: "email, firstname, and message are required",
    })
  }
  try {
    await mailSender(
      email,
      "Your Data send successfully",
      contactUsEmail(email, firstname, lastname, message, phoneNo, countrycode)
    )

    return res.status(200).json({
      success: true,
      message: "Email send successfully",
    })
  } catch {
    return res.status(500).json({
      success: false,
      message: "Something went wrong...",
    })
  }
}
