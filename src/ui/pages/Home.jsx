"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  AiOutlineArrowRight,
  AiOutlineBook,
  AiOutlineCalendar,
  AiOutlineCheckCircle,
  AiOutlineGlobal,
  AiOutlineLineChart,
  AiOutlinePlayCircle,
  AiOutlineReload,
  AiOutlineRocket,
  AiOutlineSafetyCertificate,
  AiOutlineThunderbolt,
  AiOutlineUsergroupAdd,
} from "react-icons/ai"
import { BsChevronDown, BsPlug } from "react-icons/bs"
import { FaGoogle, FaMicrosoft, FaSlack } from "react-icons/fa"

import { Link } from "@/ui/lib/router"

import Footer from "../components/common/Footer"

const faqs = [
  {
    q: "How fast can we migrate our existing data?",
    a: "Our automated migration tools can import your existing student records, financial data, and curriculum schedules in under 48 hours. Our onboarding team is with you every step of the way.",
  },
  {
    q: "Is it easy for parents and students to use?",
    a: "Yes. The parent and student portals are designed as progressive web apps, meaning they work smoothly on any smartphone without complicated downloads.",
  },
  {
    q: "Do you offer custom integrations?",
    a: "Absolutely. The platform can connect with reporting systems, productivity tools, communication workflows, and custom payment processors.",
  },
  {
    q: "What level of support is included?",
    a: "Enterprise onboarding includes guided migration, staff training, operational support, and direct help during rollout.",
  },
]

const metrics = [
  { label: "Active Students", value: "2.4M+", icon: AiOutlineUsergroupAdd },
  { label: "Uptime SLA", value: "99.99%", icon: AiOutlineLineChart },
  { label: "Countries", value: "45+", icon: AiOutlineGlobal },
  { label: "API Requests/Day", value: "150M", icon: AiOutlineThunderbolt },
]

const testimonials = [
  {
    text: "The transition was seamless. We migrated 4,000 student records over the weekend and teachers were fully trained by Monday. Incredible software.",
    author: "Dr. Robert Fischer",
    role: "Superintendent, Pioneer District",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&h=200&auto=format&fit=crop",
  },
  {
    text: "It eliminated five different apps we were paying for. Now admissions, grading, scheduling, and billing are in one gorgeous interface.",
    author: "Amanda Chen",
    role: "Operations Director",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&h=200&auto=format&fit=crop",
  },
  {
    text: "The parent portal changed how we interact with our community. Phone calls to the front desk dropped dramatically.",
    author: "Marcus Johnson",
    role: "Headmaster, Elite Prep",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&h=200&auto=format&fit=crop",
  },
  {
    text: "I used to spend three weeks generating timetables manually. The scheduling engine did it in under a minute.",
    author: "Elena Rodriguez",
    role: "Academic Coordinator",
    image:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&h=200&auto=format&fit=crop",
  },
  {
    text: "Secure, reliable, and it integrates cleanly with our existing Google Workspace setup. A dream for any IT admin in education.",
    author: "Tech Team",
    role: "Oxford Academies",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&h=200&auto=format&fit=crop",
  },
]

const onboarding = [
  {
    step: "01",
    title: "Automated Import",
    desc: "Upload your CSVs or connect your legacy database. The migration flow maps schemas and brings your records across cleanly.",
    color: "text-[#7dd3fc]",
    bg: "bg-[#112635]",
    icon: BsPlug,
  },
  {
    step: "02",
    title: "Staff Training",
    desc: "Short guided sessions help administrators and teachers adopt the system quickly without operational disruption.",
    color: "text-[#8b82ff]",
    bg: "bg-[#211c3c]",
    icon: AiOutlineBook,
  },
  {
    step: "03",
    title: "Go Live",
    desc: "Flip the switch and welcome parents and students into a cleaner, more modern daily experience.",
    color: "text-[#d4a017]",
    bg: "bg-[#2b2411]",
    icon: AiOutlineRocket,
  },
]

const logos = [
  { name: "Stanford", icon: AiOutlineBook },
  { name: "MIT Prep", icon: AiOutlineBook },
  { name: "Harvard Int", icon: AiOutlineSafetyCertificate },
  { name: "Yale Academics", icon: AiOutlineCalendar },
  { name: "Princeton Day", icon: AiOutlineUsergroupAdd },
]

function CountUpBar() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(true)
  }, [])

  return (
    <div className="w-full h-3 overflow-hidden rounded-full bg-richblack-700">
      <div
        className={`h-full rounded-full bg-green-500 transition-all duration-1000 ease-out ${
          loaded ? "w-[94%]" : "w-0"
        }`}
      />
    </div>
  )
}

function Home() {
  const marquee = useMemo(() => [...logos, ...logos], [])

  return (
    <div className="min-h-screen bg-richblack-900 selection:bg-[#c3ebfa] selection:text-richblack-900">
      <section className="relative flex min-h-[800px] h-screen items-center justify-center overflow-hidden bg-richblack-900">
        <div className="absolute inset-0 h-[120%] w-full">
          <Image
            src="/hero/dark-mode-monitor.jpg"
            alt="Dark workstation setup"
            fill
            priority
            sizes="100vw"
            className="h-full w-full scale-[1.03] object-cover object-center opacity-80"
          />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "url('/hero/bghome.svg')",
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
          <div className="absolute inset-0 bg-[#020617]/62" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(195,235,250,0.16),_transparent_34%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/42 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/88 via-[#020617]/30 to-[#020617]/76" />
        </div>

        <div className="relative z-10 mx-auto mt-20 max-w-5xl px-6 text-center">
          <h1 className="mb-8 text-6xl font-black leading-[1.05] tracking-tighter text-white md:text-8xl lg:text-[100px]">
            Education, <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-[#c3ebfa] via-white to-[#fae27c] bg-clip-text text-transparent">
              reimagined.
            </span>
          </h1>
          <p className="mx-auto mb-12 max-w-3xl text-xl font-medium leading-relaxed text-richblack-100 md:text-2xl">
            A meticulously crafted operating system for the world&apos;s most innovative schools. From enrollment to graduation, everything just works.
          </p>

          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
            <Link
              to="/signup"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-10 py-5 text-lg font-bold text-richblack-900 shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95 sm:w-auto"
            >
              Create Free Account
              <AiOutlineArrowRight className="text-xl" />
            </Link>
            <Link
              to="/login"
              className="group flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-richblack-800/65 px-10 py-5 text-lg font-bold text-white backdrop-blur-md transition-all hover:bg-richblack-700/80 sm:w-auto"
            >
              <AiOutlinePlayCircle className="text-2xl transition-colors group-hover:text-[#c3ebfa]" />
              Watch Keynote
            </Link>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-white/50">
          <span className="text-sm font-medium uppercase tracking-widest">Discover</span>
          <div className="h-12 w-px bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-richblack-700 bg-richblack-900 py-16">
        <div className="mx-auto mb-8 max-w-7xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-richblack-400">
            Powering over 2,500 institutions globally
          </p>
        </div>

        <div className="homepage-logo-strip">
          <div className="homepage-logo-strip__track items-center opacity-60 transition-opacity duration-500 hover:opacity-100">
            {marquee.map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={`${item.name}-${idx}`}
                  className="flex items-center gap-2 px-8 text-white md:px-16"
                >
                  <Icon className="h-8 w-8" />
                  <span className="text-2xl font-bold tracking-tighter">{item.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="platform" className="bg-richblack-900 px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-20">
            <h2 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-richblack-5 md:text-7xl">
              A unified platform. <br className="hidden md:block" />
              <span className="text-richblack-400">Zero compromises.</span>
            </h2>
            <p className="max-w-2xl text-2xl text-richblack-300">
              We replaced isolated legacy tools with one beautifully integrated ecosystem.
            </p>
          </div>

          <div className="grid auto-rows-[400px] grid-cols-1 gap-6 md:grid-cols-3 md:grid-rows-2">
            <div className="group relative isolate overflow-hidden rounded-[40px] bg-gray-900 md:col-span-2 md:row-span-2">
              <Image
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop"
                alt="Dashboard Design"
                fill
                sizes="(max-width: 768px) 100vw, 66vw"
                className="absolute inset-0 h-full w-full object-cover opacity-30 transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/88 to-[#020617]/25" />
              <div className="absolute inset-0 flex flex-col justify-end p-10 md:p-14">
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#c3ebfa] shadow-2xl transition-transform duration-500 group-hover:-translate-y-2">
                  <AiOutlineLineChart className="h-8 w-8 text-gray-900" />
                </div>
                <h3 className="mb-4 max-w-3xl text-4xl font-bold tracking-tight text-white md:text-6xl">
                  Executive Analytics
                </h3>
                <p className="max-w-2xl text-xl leading-relaxed text-richblack-5/90 drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)] md:text-2xl">
                  Live attendance insights, finance snapshots, and early student-performance signals in one executive command center.
                </p>
              </div>
            </div>

            <div className="group relative flex flex-col justify-between overflow-hidden rounded-[40px] border border-richblack-700 bg-richblack-800 p-10 shadow-xl shadow-black/25">
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#cfceff] opacity-30 blur-[80px] transition-opacity duration-500 group-hover:opacity-60" />
              <AiOutlineSafetyCertificate className="relative z-10 h-14 w-14 text-[#8b82ff]" />
              <div className="relative z-10">
                <h3 className="mb-4 text-3xl font-bold tracking-tight text-richblack-5">
                  Enterprise Security
                </h3>
                <p className="text-lg leading-relaxed text-richblack-100">
                  Role-aware permissions, audit logs, and encrypted workflows that protect every campus touchpoint.
                </p>
              </div>
            </div>

            <div className="group relative flex flex-col justify-between overflow-hidden rounded-[40px] border border-yellow-50/20 bg-richblack-800 p-10">
              <Image
                src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2622&auto=format&fit=crop"
                alt="Students"
                width={160}
                height={160}
                className="absolute bottom-0 right-0 h-40 w-40 rounded-tl-[40px] object-cover transition-all duration-500 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:scale-110"
                sizes="160px"
              />
              <AiOutlineUsergroupAdd className="mb-4 h-14 w-14 text-yellow-50" />
              <div className="relative z-10">
                <h3 className="mb-4 text-3xl font-bold tracking-tight text-richblack-5">
                  Parent Portals
                </h3>
                <p className="max-w-[220px] text-lg leading-relaxed text-richblack-100">
                  Give families instant access to attendance, fees, notices, and school updates from any device.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gray-900 py-24 text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2940&auto=format&fit=crop')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-12 text-center md:grid-cols-4 md:gap-8">
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <div key={metric.label} className="flex flex-col items-center">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-800 shadow-xl">
                    <Icon className="h-6 w-6 text-[#c3ebfa]" />
                  </div>
                  <div className="mb-2 text-4xl font-black tracking-tight md:text-5xl">
                    {metric.value}
                  </div>
                  <div className="text-lg font-medium text-gray-400">{metric.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="solutions" className="overflow-hidden bg-richblack-900 py-32">
        <div className="mx-auto max-w-7xl space-y-40 px-6">
          <div className="flex flex-col items-center gap-16 lg:flex-row lg:gap-24">
            <div className="lg:w-5/12">
              <h2 className="mb-8 text-5xl font-bold leading-[1.1] tracking-tight text-richblack-5 md:text-7xl">
                Flawless <br />
                <span className="text-[#c3ebfa]">Timetables.</span>
              </h2>
              <p className="mb-10 text-xl font-medium leading-relaxed text-richblack-300">
                Our scheduling flow resolves complex room and teacher conflicts in milliseconds. Generate cleaner timetables for thousands of students with one click.
              </p>
              <ul className="space-y-6">
                {[
                  "Conflict-free generation",
                  "Drag-and-drop overrides",
                  "Instant notification updates",
                ].map((text) => (
                  <li
                    key={text}
                    className="flex items-center gap-5 text-xl font-semibold text-richblack-25"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#112635]">
                      <AiOutlineCheckCircle className="h-6 w-6 text-[#c3ebfa]" />
                    </div>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-full lg:w-7/12">
              <div className="relative overflow-hidden rounded-[40px] border border-richblack-700 bg-richblack-800 shadow-2xl shadow-black/30">
                <Image
                  src="https://images.unsplash.com/photo-1611348586804-61bf6c080437?q=80&w=2674&auto=format&fit=crop"
                  alt="Calendar UI Representation"
                  width={1200}
                  height={900}
                  className="aspect-[4/3] h-auto w-full object-cover"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8 rounded-3xl border border-richblack-600 bg-richblack-800/95 p-8 shadow-xl shadow-black/40 backdrop-blur-2xl">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h4 className="text-2xl font-bold text-richblack-5">Advanced Chemistry 401</h4>
                      <p className="font-medium text-richblack-300">Dr. Peterson • Group A</p>
                    </div>
                    <span className="rounded-full bg-[#112635] px-4 py-2 text-sm font-bold text-[#7dd3fc]">
                      Science Lab B
                    </span>
                  </div>
                  <div className="mt-6 flex items-center gap-4 font-medium text-richblack-300">
                    <AiOutlineCalendar className="h-5 w-5 text-richblack-400" />
                    <span>Mon, Wed, Fri</span>
                    <span>•</span>
                    <span>10:00 AM - 11:30 AM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-16 lg:flex-row-reverse lg:gap-24">
            <div className="lg:w-5/12">
              <h2 className="mb-8 text-5xl font-bold leading-[1.1] tracking-tight text-richblack-5 md:text-7xl">
                Gradebook, <br />
                <span className="text-[#8b82ff]">unleashed.</span>
              </h2>
              <p className="mb-10 text-xl font-medium leading-relaxed text-richblack-300">
                A fast spreadsheet-style interface that teachers actually want to use. It syncs with curriculum standards and parent portals in real time.
              </p>
              <ul className="space-y-6">
                {[
                  "Keyboard-first navigation",
                  "Custom grading scales",
                  "Automated report card generation",
                ].map((text) => (
                  <li
                    key={text}
                    className="flex items-center gap-5 text-xl font-semibold text-richblack-25"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#211c3c]">
                      <AiOutlineCheckCircle className="h-6 w-6 text-[#8b82ff]" />
                    </div>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-full lg:w-7/12">
              <div className="relative overflow-hidden rounded-[40px] border border-richblack-700 bg-richblack-800 shadow-2xl shadow-black/30">
                <Image
                  src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=2940&auto=format&fit=crop"
                  alt="Student Grading Representation"
                  width={1200}
                  height={900}
                  className="aspect-[4/3] h-auto w-full object-cover"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8 rounded-3xl border border-richblack-600 bg-richblack-800/95 p-8 shadow-xl shadow-black/40 backdrop-blur-2xl">
                  <div className="mb-6 flex items-center gap-6">
                    <Image
                      src="https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=200&h=200&auto=format&fit=crop"
                      alt="Student"
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-full object-cover shadow-md"
                      sizes="64px"
                    />
                    <div>
                      <div className="text-2xl font-bold text-richblack-5">Sarah Jenkins</div>
                      <div className="font-medium text-richblack-300">Student ID: #98421 • Grade 10</div>
                    </div>
                    <div className="ml-auto text-4xl font-black text-caribbeangreen-100">A+</div>
                  </div>
                  <CountUpBar />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-richblack-700 bg-richblack-800 py-32">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="mb-6 text-5xl font-bold tracking-tight text-richblack-5 md:text-6xl">
            Plug into your ecosystem.
          </h2>
          <p className="mx-auto mb-20 max-w-2xl text-xl font-medium leading-relaxed text-richblack-300">
            The platform plays nicely with your existing stack. Two-way sync with the tools your teachers and admins already use.
          </p>

          <div className="relative mx-auto flex h-[400px] w-full max-w-4xl items-center justify-center">
            <div className="relative z-20 flex h-32 w-32 items-center justify-center rounded-3xl border border-richblack-700 bg-richblack-700 shadow-2xl shadow-black/30">
              <AiOutlineBook className="h-16 w-16 text-richblack-5" />
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute h-[300px] w-[300px] rounded-full border border-dashed border-richblack-600" />
              <div className="absolute h-[500px] w-[500px] rounded-full border border-dashed border-richblack-700" />

              <div
                className="absolute flex h-16 w-16 items-center justify-center rounded-2xl border border-richblack-700 bg-richblack-700 shadow-lg shadow-black/20"
                style={{ transform: "translate(-120px, -90px) rotate(-12deg)" }}
              >
                <FaGoogle className="h-8 w-8 text-[#4285F4]" />
              </div>
              <div
                className="absolute flex h-16 w-16 items-center justify-center rounded-2xl border border-richblack-700 bg-richblack-700 shadow-lg shadow-black/20"
                style={{ transform: "translate(90px, 120px) rotate(15deg)" }}
              >
                <AiOutlineReload className="h-8 w-8 text-[#7dd3fc]" />
              </div>
              <div
                className="absolute flex h-16 w-16 items-center justify-center rounded-2xl border border-richblack-700 bg-richblack-700 shadow-lg shadow-black/20"
                style={{ transform: "translate(200px, -150px) rotate(12deg)" }}
              >
                <FaSlack className="h-8 w-8 text-[#611f69]" />
              </div>
              <div
                className="absolute flex h-16 w-16 items-center justify-center rounded-2xl border border-richblack-700 bg-richblack-700 shadow-lg shadow-black/20"
                style={{ transform: "translate(-150px, 200px) rotate(-15deg)" }}
              >
                <FaMicrosoft className="h-8 w-8 text-[#00a4ef]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="showcase" className="border-y border-richblack-700 bg-richblack-900 py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-20 max-w-4xl text-center">
            <h2 className="mb-8 text-5xl font-bold tracking-tight text-richblack-5 md:text-7xl">
              Millions of students. <br />Zero downtime.
            </h2>
            <p className="text-2xl text-richblack-300">
              Hear from the administrators and teachers powering the future.
            </p>
          </div>

          <div className="columns-1 gap-8 space-y-8 md:columns-2 lg:columns-3">
            {testimonials.map((t, i) => (
              <div
                key={`${t.author}-${i}`}
                className="mb-8 break-inside-avoid rounded-[32px] border border-richblack-700 bg-richblack-800 p-10 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-8 flex gap-1">
                  {[...Array(5)].map((_, j) => (
                    <svg
                      key={j}
                      className="h-6 w-6 text-[#fae27c]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="mb-10 text-xl font-medium leading-relaxed text-richblack-100">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-5">
                  <Image
                    src={t.image}
                    alt={t.author}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover shadow-md"
                    sizes="64px"
                  />
                  <div>
                    <h4 className="text-lg font-bold text-richblack-5">{t.author}</h4>
                    <p className="font-medium text-richblack-300">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-richblack-900 py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-24 max-w-3xl text-center">
            <h2 className="mb-6 text-5xl font-bold tracking-tight text-richblack-5 md:text-6xl">
              Switching is effortless.
            </h2>
            <p className="text-xl font-medium text-richblack-300">
              We&apos;ve migrated thousands of schools. Our white-glove team ensures zero data loss and zero downtime during the transition.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="absolute left-[10%] right-[10%] top-12 hidden h-[2px] bg-gradient-to-r from-[#c3ebfa] via-[#cfceff] to-[#fae27c] opacity-30 md:block" />
            {onboarding.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className="relative z-10 flex flex-col items-center text-center"
                >
                  <div
                    className={`mb-8 flex h-24 w-24 items-center justify-center rounded-full border-4 border-richblack-700 shadow-xl shadow-black/20 ${item.bg}`}
                  >
                    <Icon className={`h-10 w-10 ${item.color}`} />
                  </div>
                  <div className="mb-3 text-sm font-black uppercase tracking-widest text-richblack-400">
                    Phase {item.step}
                  </div>
                  <h3 className="mb-4 text-2xl font-bold text-richblack-5">{item.title}</h3>
                  <p className="max-w-sm text-lg font-medium leading-relaxed text-richblack-300">
                    {item.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-richblack-700 bg-richblack-900 py-32">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-20 text-center text-5xl font-bold tracking-tight text-richblack-5 md:text-6xl">
            Questions? Answers.
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group overflow-hidden rounded-[32px] border border-richblack-700 bg-richblack-800"
              >
                <summary className="flex list-none cursor-pointer items-center justify-between p-8 text-2xl font-bold text-richblack-5 md:p-10">
                  {faq.q}
                  <span className="flex-shrink-0 rounded-full border border-richblack-600 bg-richblack-700 p-3 shadow-sm transition duration-300 group-open:rotate-180">
                    <BsChevronDown className="h-6 w-6 text-richblack-5" />
                  </span>
                </summary>
                <div className="px-8 pb-10 pt-0 text-xl font-medium leading-relaxed text-richblack-300 md:px-10">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative flex flex-col items-center overflow-hidden bg-gray-900 px-6 pb-20 pt-40">
        <div className="absolute left-1/2 top-0 h-[1px] w-full max-w-5xl -translate-x-1/2 bg-gradient-to-r from-transparent via-[#c3ebfa] to-transparent opacity-50" />
        <div className="pointer-events-none absolute left-1/2 top-[-10%] h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-[#c3ebfa] opacity-20 blur-[200px]" />

        <div className="relative z-10 mx-auto mb-40 max-w-5xl text-center">
          <h2 className="mb-10 text-6xl font-black tracking-tighter text-white md:text-9xl">
            Your school, <br />
            <span className="bg-gradient-to-r from-richblack-50 to-richblack-300 bg-clip-text text-transparent">
              upgraded.
            </span>
          </h2>
          <p className="mx-auto mb-14 max-w-3xl text-2xl leading-relaxed text-richblack-100 md:text-3xl">
            Join the future of educational administration today. Setup takes minutes, impact lasts generations.
          </p>
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
            <Link
              to="/signup"
              className="w-full rounded-full bg-white px-12 py-6 text-xl font-black text-gray-900 shadow-[0_0_60px_rgba(255,255,255,0.15)] transition-all hover:scale-105 active:scale-95 sm:w-auto"
            >
              Start Free Trial
            </Link>
            <Link
              to="/contact"
              className="w-full rounded-full border border-gray-700 bg-gray-800 px-12 py-6 text-xl font-bold text-white transition-all hover:bg-gray-700 sm:w-auto"
            >
              Contact Sales
            </Link>
          </div>
        </div>

        <div className="w-full">
          <Footer />
        </div>
      </section>
    </div>
  )
}

export default Home
