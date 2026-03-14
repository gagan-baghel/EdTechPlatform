import React from "react"
import Image from "next/image"
import { AiOutlineArrowRight, AiOutlineCheckCircle, AiOutlineLineChart, AiOutlineRocket } from "react-icons/ai"
import { Link } from "@/ui/lib/router"

import Footer from "../components/common/Footer"

const heroImage =
  "https://images.unsplash.com/photo-1580582932707-520aed937b7b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTU4NDh8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBzY2hvb2wlMjBjYW1wdXMlMjBzdHVkZW50cyUyMGhhbGx3YXl8ZW58MHx8fHwxNzY3NDA0NzI4fDA&ixlib=rb-4.1.0&q=85"

const teamImage =
  "https://plus.unsplash.com/premium_photo-1661284896386-0ff76f0b4ae0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTU4NDh8MHwxfHNlYXJjaHwxfHxlZHVjYXRvcnMlMjBtZWV0aW5nJTIwY2xhc3Nyb29tJTIwdGVjaG5vbG9neSUyMHBob3RvfGVufDB8fHx8MTc2NzQwNDcwNHww&ixlib=rb-4.1.0&q=85"

const pillars = [
  {
    icon: AiOutlineCheckCircle,
    title: "Operational clarity",
    description: "Replace scattered tools with one calm system.",
  },
  {
    icon: AiOutlineLineChart,
    title: "Visible outcomes",
    description: "See academic, financial, and parent activity faster.",
  },
  {
    icon: AiOutlineRocket,
    title: "Clean rollout",
    description: "Adopt modern workflows without adding noise.",
  },
]

const stats = [
  { value: "2.4M+", label: "Active Students" },
  { value: "45+", label: "Countries" },
  { value: "99.99%", label: "Uptime SLA" },
]

function About() {
  return (
    <div className="bg-richblack-900 text-white">
      <section className="relative overflow-hidden px-6 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(195,235,250,0.18),_transparent_30%)]" />
        <div className="absolute inset-y-0 right-0 w-[40%] bg-[radial-gradient(circle_at_center,_rgba(250,226,124,0.09),_transparent_60%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-richblack-100 backdrop-blur-xl">
              About IntelleCraft
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.02] tracking-tighter text-white sm:text-6xl lg:text-7xl">
              Modern school operations,{" "}
              <span className="bg-gradient-to-r from-[#c3ebfa] via-white to-[#fae27c] bg-clip-text text-transparent">
                kept simple.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-richblack-100 sm:text-lg">
              IntelleCraft is built for institutions that want fewer tools, cleaner workflows, and a sharper daily experience for staff, students, and families.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/10 bg-richblack-800/70 px-4 py-5 text-center backdrop-blur-xl"
                >
                  <div className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {item.value}
                  </div>
                  <div className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-richblack-300 sm:text-[0.72rem]">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-richblack-900 transition-all hover:scale-[1.01]"
              >
                Start free
                <AiOutlineArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-richblack-800/70 px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-richblack-700/80"
              >
                Talk to us
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[36px] border border-white/10 bg-richblack-800/70 shadow-[0_30px_90px_rgba(0,8,20,0.42)]">
            <Image
              src={heroImage}
              alt="Modern school campus"
              width={1200}
              height={900}
              className="h-[320px] w-full object-cover sm:h-[420px]"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section className="px-6 py-6 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-3">
          {pillars.map((item) => {
            const Icon = item.icon

            return (
              <div
                key={item.title}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-richblack-800 text-[#c3ebfa]">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-richblack-5">{item.title}</h2>
                <p className="mt-2 text-sm leading-7 text-richblack-200">{item.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="px-6 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.95fr] lg:gap-16">
          <div className="overflow-hidden rounded-[36px] border border-white/10 bg-richblack-800/70 shadow-[0_30px_90px_rgba(0,8,20,0.42)]">
            <Image
              src={teamImage}
              alt="Educators collaborating with technology"
              width={1200}
              height={900}
              className="h-[320px] w-full object-cover sm:h-[420px]"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-richblack-800/70 p-6 backdrop-blur-xl">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-richblack-300">
                Why we built it
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Schools need sharper systems, not more tabs.
              </h2>
              <p className="mt-4 text-base leading-8 text-richblack-200">
                We focus on the parts of education software that matter most: speed, clarity, trust, and fewer operational dead ends.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-richblack-800/70 p-6 backdrop-blur-xl">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-richblack-300">
                What we believe
              </p>
              <p className="mt-3 text-base leading-8 text-richblack-200">
                Great institutional software should feel calm, fast, and obvious to use from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 sm:px-8 lg:px-10 lg:pb-24">
        <div className="mx-auto max-w-5xl rounded-[36px] border border-white/10 bg-richblack-800/70 px-6 py-10 text-center shadow-[0_30px_90px_rgba(0,8,20,0.42)] backdrop-blur-xl sm:px-10">
          <h2 className="text-4xl font-black tracking-tighter text-white sm:text-5xl">
            Build a calmer campus workflow.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-richblack-200">
            Start with the core operations your team touches every day.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-bold text-richblack-900 transition-all hover:scale-[1.01]"
            >
              Create account
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-richblack-900/70 px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-richblack-800"
            >
              Contact sales
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default About
