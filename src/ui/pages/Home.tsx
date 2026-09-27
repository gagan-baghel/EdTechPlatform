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
  AiOutlineRocket,
  AiOutlineSafetyCertificate,
  AiOutlineUsergroupAdd,
} from "react-icons/ai"
import { BsChevronDown } from "react-icons/bs"

import { useTranslations } from "next-intl"

import { Link } from "@/ui/lib/router"

import type { ApiFailure } from "@/types/api"
import Footer from "../components/common/Footer"
import { HeroGraphic } from "../components/core/HomePage/Graphics"
import { apiConnector } from "../services/apiconnector"
import { categories, courseEndpoints } from "../services/apis"
import { fetchReviewsCached } from "../services/sharedData"
import { normalizeAvatarUrl } from "../utils/avatar"
import { CountUp } from "../components/common/DashKit"
import type { DataBody } from "../types"
import IntegrationOrbit from "../components/core/HomePage/IntegrationOrbit"
import Reveal from "../components/common/Reveal"
import React from "react"

/** Unsplash photography (free for commercial use), resized by their CDN. */
const photo = (id: string, width = 1600) =>
  `https://images.unsplash.com/photo-${id}?q=80&w=${width}&auto=format&fit=crop`

/** Every answer is a rule the code enforces — see the API's constants. */
const faqs = [
  {
    q: "How do I get a certificate?",
    a: "Complete every lecture in a course and pass every course-level quiz. The certificate is issued automatically, and anyone can verify it on its public page using the certificate number.",
  },
  {
    q: "How many times can I take a quiz?",
    a: "Up to ten attempts per quiz. Once you pass — or use all ten — you can review every question with the correct answer and the instructor's explanation.",
  },
  {
    q: "What if a course isn't right for me?",
    a: "If you have completed less than half of a course thirty days after enrolling, you are eligible for a refund. Contact us and it will be returned to your original payment method.",
  },
  {
    q: "Can I learn in Hindi?",
    a: "Yes — the whole interface is available in English and Hindi. Switch any time from the language menu at the top of the page.",
  },
  {
    q: "How do instructors get paid?",
    a: "Instructors add their bank details and complete KYC once. Earnings from every sale are totalled into payouts, and the platform fee is shown up front.",
  },
]

/** Teaching here, in the order it actually happens. */
const onboarding = [
  {
    step: "01",
    title: "Build your course",
    desc: "Sections, video lectures, attachments and quizzes in one builder — with an AI outline and quiz drafts written from your own transcripts.",
    color: "text-[#7dd3fc]",
    bg: "bg-[#112635]",
    icon: AiOutlineBook,
  },
  {
    step: "02",
    title: "Publish and teach",
    desc: "Go live when you're ready, schedule live classes, and answer questions right under each lecture.",
    color: "text-[#8b82ff]",
    bg: "bg-[#211c3c]",
    icon: AiOutlineRocket,
  },
  {
    step: "03",
    title: "Watch it work",
    desc: "See revenue, completion and the students who need a nudge — then get paid out to your bank account.",
    color: "text-[#d4a017]",
    bg: "bg-[#2b2411]",
    icon: AiOutlineLineChart,
  },
]

interface PublicStats {
  courses: number
  learners: number
  instructors: number
  certificates: number
}

interface PublicReview {
  rating?: number | string
  review?: string
  course?: { courseName?: string }
  user?: { firstName?: string; lastName?: string; image?: string }
}

// Bar grows from 0 to 94% with a pure CSS animation — no JS state required,
// so there is no useEffect setState cascade and no React Compiler lint error.
function CountUpBar() {
  return (
    <div className="w-full h-3 overflow-hidden rounded-full bg-richblack-700">
      <div
        className="h-full rounded-full bg-green-500"
        style={{
          width: "94%",
          animation: "countup-bar 1s ease-out forwards",
          transformOrigin: "left",
        }}
      />
      <style>{`
        @keyframes countup-bar {
          from { width: 0; }
          to   { width: 94%; }
        }
      `}</style>
    </div>
  )
}

function Home() {
  const t = useTranslations("Home")
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [categoryNames, setCategoryNames] = useState<string[]>([])
  const [reviews, setReviews] = useState<PublicReview[]>([])
  const marquee = useMemo(() => [...categoryNames, ...categoryNames], [categoryNames])
  const courseCount = stats?.courses ?? null

  // Everything on this page that is a number or a name comes from the
  // database. Quiet fetches: a section with nothing real to show is left out.
  useEffect(() => {
    apiConnector<DataBody<PublicStats> | ApiFailure>("GET", courseEndpoints.PUBLIC_STATS_API)
      .then((res) => {
        if (res.data.success) setStats(res.data.data)
      })
      .catch(() => undefined)
    apiConnector<DataBody<Array<{ name?: string | null }>> | ApiFailure>("GET", categories.CATEGORIES_API)
      .then((res) => {
        if (res.data.success) setCategoryNames(res.data.data.map((c) => c.name ?? "").filter(Boolean))
      })
      .catch(() => undefined)
    fetchReviewsCached()
      .then((rows) =>
        setReviews((rows as PublicReview[]).filter((r) => typeof r.review === "string" && r.review.trim().length >= 20).slice(0, 6))
      )
      .catch(() => undefined)
  }, [])

  const metrics = stats
    ? [
        { label: stats.courses === 1 ? "Course live" : "Courses live", value: stats.courses, icon: AiOutlineBook },
        { label: stats.learners === 1 ? "Learner" : "Learners", value: stats.learners, icon: AiOutlineUsergroupAdd },
        { label: stats.instructors === 1 ? "Instructor" : "Instructors", value: stats.instructors, icon: AiOutlineGlobal },
        {
          label: stats.certificates === 1 ? "Certificate issued" : "Certificates issued",
          value: stats.certificates,
          icon: AiOutlineSafetyCertificate,
        },
      ]
    : []

  return (
    // The page as a whole follows the site theme. It used to pin
    // data-theme="dark" here, which meant the light-mode toggle did nothing at
    // all on the homepage — the single most visible theming bug in the app.
    // Only the sections that are genuinely locked dark (a dark photo with
    // hardcoded #020617 overlays and white text on top) keep the pin, marked
    // individually below.
    <div className="min-h-screen bg-richblack-900 selection:bg-[#c3ebfa] selection:text-ink">
      {/* Hero. Locked dark: the photograph is dark whatever the theme, so the
          type over it is pinned light. A flat scrim — not a gradient stack —
          keeps it legible; the scorecard beside the headline is the product
          itself, drawn and animated (HomePage/Graphics.tsx). */}
      <section data-theme="dark" className="relative overflow-hidden border-b border-richblack-600 bg-richblack-900">
        <Image
          src={photo("1522202176988-66273c2fd55f", 2400)}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-60"
        />
        <div className="absolute inset-0 bg-richblack-900/75" aria-hidden />

        <div className="relative mx-auto grid min-h-[calc(100dvh-3.5rem)] w-full max-w-[1240px] grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-10">
          <div className="page-enter">
            <p className="stamp flex items-center gap-2 text-richblack-200">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              {courseCount !== null
                ? `${courseCount} course${courseCount === 1 ? "" : "s"} open for enrolment`
                : "Courses open for enrolment"}
            </p>
            <h1 className="mt-6 text-[3.25rem] font-semibold leading-[0.95] tracking-[-0.05em] text-richblack-5 sm:text-7xl lg:text-[5.5rem]">
              {t("heroLine1")}
              <br />
              <span className="text-accent">{t("heroLine2")}</span>
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-richblack-100">{t("heroSubtitle")}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/search"
                className="stamp inline-flex items-center gap-2 bg-yellow-50 px-6 py-4 text-on-signal transition-[filter] hover:brightness-110"
              >
                {t("browseCourses")} <AiOutlineArrowRight aria-hidden />
              </Link>
              <Link
                to="/signup"
                className="stamp inline-flex items-center gap-2 border border-richblack-300 px-6 py-4 text-richblack-5 transition-colors hover:border-richblack-5"
              >
                {t("teach")}
              </Link>
            </div>
          </div>
          <div className="page-enter [animation-delay:150ms]">
            <HeroGraphic />
          </div>
        </div>
      </section>

      {/* A marquee of one or two names just repeats itself; below three
          subjects the section waits until the catalogue has grown. */}
      {categoryNames.length >= 3 && (
      <section className="relative overflow-hidden border-b border-richblack-700 bg-richblack-900 py-16">
        <div className="mx-auto mb-8 max-w-7xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-richblack-400">
            Learn across {categoryNames.length} subject{categoryNames.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="homepage-logo-strip">
          <div className="homepage-logo-strip__track items-center opacity-60 transition-opacity duration-500 hover:opacity-100">
            {marquee.map((name, idx) => (
              <Link
                key={`${name}-${idx}`}
                to={`/catalog/${name.split(" ").join("-").toLowerCase()}`}
                tabIndex={idx < categoryNames.length ? 0 : -1}
                aria-hidden={idx >= categoryNames.length}
                className="flex items-center gap-2 px-8 text-richblack-5 hover:text-accent md:px-16"
              >
                <AiOutlineBook className="h-8 w-8" />
                <span className="text-2xl font-bold tracking-tighter">{name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      <section id="platform" className="bg-richblack-900 px-6 py-32">
        <Reveal className="mx-auto max-w-7xl">
          <div className="mb-20">
            <h2 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-richblack-5 md:text-7xl">
              Everything a course needs. <br className="hidden md:block" />
              <span className="text-richblack-400">Nothing it doesn&apos;t.</span>
            </h2>
            <p className="max-w-2xl text-2xl text-richblack-300">
              Video lectures, quizzes, live classes, Q&amp;A, notes and certificates — in one place, for the people learning and the people teaching.
            </p>
          </div>

          <div className="grid auto-rows-[400px] grid-cols-1 gap-6 md:grid-cols-3 md:grid-rows-2">
            {/* Locked dark: photo tile with white type over a fixed gradient. */}
            <div data-theme="dark" className="group relative isolate overflow-hidden rounded-[40px] bg-richblack-900 md:col-span-2 md:row-span-2">
              <Image
                src={photo("1522881193457-37ae97c905bf", 2000)}
                alt="An instructor working through a lesson with a student"
                fill
                sizes="(max-width: 768px) 100vw, 66vw"
                className="absolute inset-0 h-full w-full object-cover opacity-30 transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/88 to-[#020617]/25" />
              <div className="absolute inset-0 flex flex-col justify-end p-10 md:p-14">
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#c3ebfa] shadow-2xl transition-transform duration-500 group-hover:-translate-y-2">
                  <AiOutlineLineChart className="h-8 w-8 text-ink" />
                </div>
                <h3 className="mb-4 max-w-3xl text-4xl font-bold tracking-tight text-white md:text-6xl">
                  Instructor analytics
                </h3>
                <p className="max-w-2xl text-xl leading-relaxed text-richblack-5/90 drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)] md:text-2xl">
                  Revenue, enrolments and minutes watched by day, the lecture where students stop, and the learners who need a nudge — for every course you teach.
                </p>
              </div>
            </div>

            <div className="group relative flex flex-col justify-between overflow-hidden rounded-[40px] border border-richblack-700 bg-richblack-800 p-10 shadow-xl shadow-black/25">
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#cfceff] opacity-30 blur-[80px] transition-opacity duration-500 group-hover:opacity-60" />
              <AiOutlineSafetyCertificate className="relative z-10 h-14 w-14 text-[#8b82ff]" />
              <div className="relative z-10">
                <h3 className="mb-4 text-3xl font-bold tracking-tight text-richblack-5">
                  Honest grading
                </h3>
                <p className="text-lg leading-relaxed text-richblack-100">
                  Quizzes are graded on the server against a stored key, with capped attempts — so a pass means something.
                </p>
              </div>
            </div>

            <div className="group relative flex flex-col justify-between overflow-hidden rounded-[40px] border border-yellow-50/20 bg-richblack-800 p-10">
              <Image
                src={photo("1541339907198-e08756dedf3f", 400)}
                alt="Graduates throwing their caps"
                width={160}
                height={160}
                className="absolute bottom-0 right-0 h-40 w-40 rounded-tl-[40px] object-cover transition-all duration-500 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:scale-110"
                sizes="160px"
              />
              <AiOutlineUsergroupAdd className="mb-4 h-14 w-14 text-yellow-50" />
              <div className="relative z-10">
                <h3 className="mb-4 text-3xl font-bold tracking-tight text-richblack-5">
                  Certificates
                </h3>
                <p className="max-w-[220px] text-lg leading-relaxed text-richblack-100">
                  Earned automatically, and verifiable by anyone with the certificate number.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Locked dark: bg-richblack-900 and a photograph, neither of which flips.
          The figures are counted live (GET /course/stats), not written in. */}
      {metrics.length > 0 && (
      <section data-theme="dark" className="relative overflow-hidden bg-richblack-900 py-24 text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              `url('${photo("1606761568499-6d2451b23c66", 2400)}')`,
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
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-richblack-800 shadow-xl">
                    <Icon className="h-6 w-6 text-[#c3ebfa]" />
                  </div>
                  <div className="mb-2 text-4xl font-black tracking-tight md:text-5xl">
                    <CountUp value={metric.value.toLocaleString()} />
                  </div>
                  <div className="text-lg font-medium text-richblack-300">{metric.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      )}

      <section id="solutions" className="overflow-hidden bg-richblack-900 py-32">
        <Reveal className="mx-auto max-w-7xl space-y-40 px-6">
          <div className="flex flex-col items-center gap-16 lg:flex-row lg:gap-24">
            <div className="lg:w-5/12">
              <h2 className="mb-8 text-5xl font-bold leading-[1.1] tracking-tight text-richblack-5 md:text-7xl">
                Live classes, <br />
                <span className="text-[#c3ebfa]">in the course.</span>
              </h2>
              <p className="mb-10 text-xl font-medium leading-relaxed text-richblack-300">
                Instructors schedule live sessions right inside the course. Everyone enrolled is notified, and the recording is posted to the same page afterwards.
              </p>
              <ul className="space-y-6">
                {[
                  "Scheduled inside the course",
                  "Enrolled students notified",
                  "Recordings posted after",
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
                  src={photo("1588196749597-9ff075ee6b5b", 1600)}
                  alt="A live online class on a laptop screen"
                  width={1200}
                  height={900}
                  className="aspect-[4/3] h-auto w-full object-cover"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-richblack-900/60 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8 rounded-3xl border border-richblack-600 bg-richblack-800/95 p-8 shadow-xl shadow-black/40 backdrop-blur-2xl">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h4 className="text-2xl font-bold text-richblack-5">Live Q&amp;A: Async JavaScript</h4>
                      <p className="font-medium text-richblack-300">Example session • 60 minutes</p>
                    </div>
                    <span className="rounded-full bg-[#112635] px-4 py-2 text-sm font-bold text-[#7dd3fc]">
                      Live
                    </span>
                  </div>
                  <div className="mt-6 flex items-center gap-4 font-medium text-richblack-300">
                    <AiOutlineCalendar className="h-5 w-5 text-richblack-400" />
                    <span>Thursday</span>
                    <span>•</span>
                    <span>7:00 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-16 lg:flex-row-reverse lg:gap-24">
            <div className="lg:w-5/12">
              <h2 className="mb-8 text-5xl font-bold leading-[1.1] tracking-tight text-richblack-5 md:text-7xl">
                A scorecard, <br />
                <span className="text-[#8b82ff]">not a guess.</span>
              </h2>
              <p className="mb-10 text-xl font-medium leading-relaxed text-richblack-300">
                Every learner sees their grade in each course, their best score on every quiz, and where they stand in the class — updated as they learn.
              </p>
              <ul className="space-y-6">
                {[
                  "Grade and score per course",
                  "Class position and leaderboard",
                  "Printable report card",
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
                  src={photo("1513258496099-48168024aec0", 1600)}
                  alt="A learner studying with headphones and a laptop"
                  width={1200}
                  height={900}
                  className="aspect-[4/3] h-auto w-full object-cover"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-richblack-900/60 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8 rounded-3xl border border-richblack-600 bg-richblack-800/95 p-8 shadow-xl shadow-black/40 backdrop-blur-2xl">
                  <div className="mb-6 flex items-center gap-6">
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-richblack-700 text-2xl font-bold text-richblack-5">
                      #3
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-richblack-5">Your scorecard</div>
                      <div className="font-medium text-richblack-300">Example • 4 of 6 lectures • 3rd of 42</div>
                    </div>
                    <div className="ml-auto text-4xl font-black text-caribbeangreen-100">B</div>
                  </div>
                  <CountUpBar />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="relative overflow-hidden border-t border-richblack-700 bg-richblack-800 py-32">
        <Reveal className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="mb-6 text-5xl font-bold tracking-tight text-richblack-5 md:text-6xl">
            Built on services you can trust.
          </h2>
          <p className="mx-auto mb-20 max-w-2xl text-xl font-medium leading-relaxed text-richblack-300">
            Payments through Razorpay, lectures streamed from a global CDN, transcripts by OpenAI Whisper, and an AI tutor that answers from the lecture itself.
          </p>

          <IntegrationOrbit />
        </Reveal>
      </section>

      {reviews.length > 0 && (
      <section id="showcase" className="border-y border-richblack-700 bg-richblack-900 py-32">
        <Reveal className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-20 max-w-4xl text-center">
            <h2 className="mb-8 text-5xl font-bold tracking-tight text-richblack-5 md:text-7xl">
              In learners&apos; <br />own words.
            </h2>
            <p className="text-2xl text-richblack-300">
              Reviews left on courses, as written.
            </p>
          </div>

          <div className="columns-1 gap-8 space-y-8 md:columns-2 lg:columns-3">
            {reviews.map((review, i) => (
              <div
                key={i}
                className="mb-8 break-inside-avoid rounded-[32px] border border-richblack-700 bg-richblack-800 p-10 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-8 flex gap-1">
                  {[...Array(Math.max(1, Math.min(5, Math.round(Number(review.rating) || 0))))].map((_, j) => (
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
                  &ldquo;{review.review}&rdquo;
                </p>
                <div className="flex items-center gap-5">
                  <Image
                    src={normalizeAvatarUrl(review.user?.image, review.user?.firstName, review.user?.lastName)}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover shadow-md"
                    sizes="64px"
                  />
                  <div>
                    <h4 className="text-lg font-bold text-richblack-5">
                      {review.user?.firstName} {review.user?.lastName?.charAt(0)}.
                    </h4>
                    <p className="font-medium text-richblack-300">{review.course?.courseName}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      )}

      <section className="relative bg-richblack-900 py-32">
        <Reveal className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-24 max-w-3xl text-center">
            <h2 className="mb-6 text-5xl font-bold tracking-tight text-richblack-5 md:text-6xl">
              Teaching here takes three steps.
            </h2>
            <p className="text-xl font-medium text-richblack-300">
              Sign up as an instructor and the whole toolkit is yours — no sales call, no setup fee.
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
                    Step {item.step}
                  </div>
                  <h3 className="mb-4 text-2xl font-bold text-richblack-5">{item.title}</h3>
                  <p className="max-w-sm text-lg font-medium leading-relaxed text-richblack-300">
                    {item.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </Reveal>
      </section>

      <section id="faq" className="border-t border-richblack-700 bg-richblack-900 py-32">
        <Reveal className="mx-auto max-w-4xl px-6">
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
        </Reveal>
      </section>

      {/* Locked dark: fixed bg-richblack-900 closing panel. */}
      <section data-theme="dark" className="relative flex flex-col items-center overflow-hidden bg-richblack-900 px-6 pb-20 pt-40">
        <div className="absolute left-1/2 top-0 h-[1px] w-full max-w-5xl -translate-x-1/2 bg-gradient-to-r from-transparent via-[#c3ebfa] to-transparent opacity-50" />
        <div className="pointer-events-none absolute left-1/2 top-[-10%] h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-[#c3ebfa] opacity-20 blur-[200px]" />

        <div className="relative z-10 mx-auto mb-40 max-w-5xl text-center">
          <h2 className="mb-10 text-6xl font-black tracking-tighter text-white md:text-9xl">
            Start with <br />
            <span className="bg-gradient-to-r from-richblack-50 to-richblack-300 bg-clip-text text-transparent">
              one lecture.
            </span>
          </h2>
          <p className="mx-auto mb-14 max-w-3xl text-2xl leading-relaxed text-richblack-100 md:text-3xl">
            Browse the catalogue and enrol in minutes — or open a course of your own and start teaching.
          </p>
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
            <Link
              to="/signup"
              className="w-full rounded-full bg-white px-12 py-6 text-xl font-black text-ink shadow-[0_0_60px_rgba(255,255,255,0.15)] transition-all hover:scale-105 active:scale-95 sm:w-auto"
            >
              Create an account
            </Link>
            <Link
              to="/search"
              className="w-full rounded-full border border-richblack-700 bg-richblack-800 px-12 py-6 text-xl font-bold text-white transition-all hover:bg-richblack-700 sm:w-auto"
            >
              Browse courses
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
