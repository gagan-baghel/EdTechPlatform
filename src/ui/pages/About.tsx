import React from "react"
import Image from "next/image"
import { AiOutlineArrowRight, AiOutlineCheckCircle, AiOutlineLineChart, AiOutlineRocket } from "react-icons/ai"
import { Link } from "@/ui/lib/router"

import Footer from "../components/common/Footer"

// Unsplash photography (free for commercial use).
const heroImage =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1600&auto=format&fit=crop"

const teamImage =
  "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1600&auto=format&fit=crop"

const pillars = [
  {
    icon: AiOutlineCheckCircle,
    title: "Learning you can see",
    description: "Progress, quiz scores and a class position for every course, updated as you learn.",
  },
  {
    icon: AiOutlineLineChart,
    title: "Teaching with evidence",
    description: "Instructors see where students stop and which questions they miss.",
  },
  {
    icon: AiOutlineRocket,
    title: "Proof that holds up",
    description: "Certificates anyone can verify, earned by finishing and passing.",
  },
]

// Facts about how the platform works — not audience numbers, which live on
// the homepage and are counted from the database.
const stats = [
  { value: "EN · HI", label: "Languages" },
  { value: "10", label: "Quiz attempts" },
  { value: "30 days", label: "Refund window" },
]

function About() {
  return (
    // Follows the site theme. The gradient wordmark that kept this pinned is
    // now theme-aware — see .brand-gradient in globals.css.
    <div className="bg-richblack-900 text-richblack-5">
      <section className="relative overflow-hidden px-6 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(195,235,250,0.18),_transparent_30%)]" />
        <div className="absolute inset-y-0 right-0 w-[40%] bg-[radial-gradient(circle_at_center,_rgba(250,226,124,0.09),_transparent_60%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-richblack-100 backdrop-blur-xl">
              About IntelleCraft
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.02] tracking-tighter text-richblack-5 sm:text-6xl lg:text-7xl">
              Learning that shows{" "}
              <span className="brand-gradient">
                its work.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-richblack-100 sm:text-lg">
              IntelleCraft is an online learning platform: courses from working instructors, quizzes graded honestly, a scorecard for every learner, and certificates anyone can check.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/10 bg-richblack-800/70 px-4 py-5 text-center backdrop-blur-xl"
                >
                  <div className="text-2xl font-black tracking-tight text-richblack-5 sm:text-3xl">
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
                to="/search"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-ink transition-all hover:scale-[1.01]"
              >
                Browse courses
                <AiOutlineArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-richblack-800/70 px-8 py-4 text-sm font-semibold text-richblack-5 transition-all hover:bg-richblack-700/80"
              >
                Talk to us
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[36px] border border-white/10 bg-richblack-800/70 shadow-[0_30px_90px_rgba(0,8,20,0.42)]">
            <Image
              src={heroImage}
              alt="Students studying together in a library"
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
              alt="A classroom of students and their teacher"
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
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-richblack-5 sm:text-4xl">
                A certificate should mean you learned something.
              </h2>
              <p className="mt-4 text-base leading-8 text-richblack-200">
                So quizzes are graded where they can&apos;t be gamed, progress is measured rather than claimed, and every certificate carries a number anyone can look up.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-richblack-800/70 p-6 backdrop-blur-xl">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-richblack-300">
                What we believe
              </p>
              <p className="mt-3 text-base leading-8 text-richblack-200">
                Learners deserve to know exactly where they stand, and instructors deserve to see what is working — both from the same honest numbers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 sm:px-8 lg:px-10 lg:pb-24">
        <div className="mx-auto max-w-5xl rounded-[36px] border border-white/10 bg-richblack-800/70 px-6 py-10 text-center shadow-[0_30px_90px_rgba(0,8,20,0.42)] backdrop-blur-xl sm:px-10">
          <h2 className="text-4xl font-black tracking-tighter text-richblack-5 sm:text-5xl">
            Learn something properly.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-richblack-200">
            Pick a course, or teach one of your own.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-bold text-ink transition-all hover:scale-[1.01]"
            >
              Create account
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-richblack-900/70 px-8 py-4 text-sm font-semibold text-richblack-5 transition-all hover:bg-richblack-800"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default About
