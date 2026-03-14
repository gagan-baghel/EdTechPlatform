import React from "react"
import { AiOutlineMail, AiOutlinePhone } from "react-icons/ai"
import { BiWorld } from "react-icons/bi"

const contactDetails = [
  {
    icon: AiOutlineMail,
    heading: "Email",
    description: "Product, sales, and rollout questions.",
    details: "support@intellecraft.com",
  },
  {
    icon: BiWorld,
    heading: "Coverage",
    description: "Remote-first support for institutions globally.",
    details: "Available across time zones",
  },
  {
    icon: AiOutlinePhone,
    heading: "Hours",
    description: "Monday to Friday",
    details: "9:00 AM to 6:00 PM",
  },
]

const ContactDetails = () => {
  return (
    <div className="flex h-full flex-col gap-4 rounded-[32px] border border-white/10 bg-richblack-800/70 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl lg:p-6">
      {contactDetails.map((ele, i) => {
        const Icon = ele.icon
        return (
          <div
            className="rounded-[24px] border border-white/10 bg-richblack-900/70 p-4 text-sm text-richblack-200"
            key={i}
          >
            <div className="flex flex-row items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-[#c3ebfa]">
                <Icon size={22} />
              </div>
              <h1 className="text-lg font-semibold text-richblack-5">
                {ele?.heading}
              </h1>
            </div>
            <p className="mt-3 leading-7 text-richblack-300">{ele?.description}</p>
            <p className="font-semibold text-richblack-5">{ele?.details}</p>
          </div>
        )
      })}
    </div>
  )
}

export default ContactDetails
