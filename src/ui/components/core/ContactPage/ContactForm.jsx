import React from "react"

import ContactUsForm from "./ContactUsForm"

const ContactForm = () => {
  return (
    <div className="flex flex-col gap-3 rounded-[32px] border border-white/10 bg-richblack-800/70 p-7 text-richblack-300 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl lg:p-10">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-richblack-300">
        Send a message
      </p>
      <h1 className="text-4xl font-bold leading-tight tracking-tight text-richblack-5">
        Tell us what you need.
      </h1>
      <p className="max-w-xl text-sm leading-7 text-richblack-200">
        Keep it brief. We&apos;ll take it from there.
      </p>

      <div className="mt-4">
        <ContactUsForm />
      </div>
    </div>
  )
}

export default ContactForm
