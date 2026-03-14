import React from "react"
import Image from "next/image"

import Footer from "../components/common/Footer"
import ContactDetails from "../components/core/ContactPage/ContactDetails.jsx"
import ContactForm from "../components/core/ContactPage/ContactForm"

const contactImage =
  "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2940&auto=format&fit=crop"

function Contact() {
  return (
    <div className="bg-richblack-900 text-white">
      <section className="relative overflow-hidden px-6 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(195,235,250,0.18),_transparent_32%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-richblack-100 backdrop-blur-xl">
              Contact us
            </div>
            <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-tighter text-white sm:text-6xl lg:text-7xl">
              Let&apos;s keep it{" "}
              <span className="bg-gradient-to-r from-[#c3ebfa] via-white to-[#fae27c] bg-clip-text text-transparent">
                simple.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-richblack-100 sm:text-lg">
              Reach out for product questions, rollout planning, or partnership conversations.
            </p>
          </div>

          <div className="overflow-hidden rounded-[36px] border border-white/10 bg-richblack-800/70 shadow-[0_30px_90px_rgba(0,8,20,0.42)]">
            <Image
              src={contactImage}
              alt="Support team at work"
              width={1200}
              height={900}
              className="h-[320px] w-full object-cover sm:h-[420px]"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 sm:px-8 lg:px-10 lg:pb-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.42fr_0.58fr]">
          <div>
            <ContactDetails />
          </div>
          <div>
            <ContactForm />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Contact
