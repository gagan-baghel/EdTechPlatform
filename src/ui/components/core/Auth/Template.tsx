import React from "react"
import Image from "next/image"
import { useSelector } from "react-redux"
import { AiOutlineArrowRight } from "react-icons/ai"
import { Link } from "@/ui/lib/router"
import type { RootState } from "../../../store"

import LoginForm from "./LoginForm"
import SignupForm from "./SignupForm"
import Spinner from "../../common/Spinner"

const contentByType = {
  login: {
    badge: "Secure campus access",
    cardTitle: "Sign in",
    cardDescription: "Access your workspace.",
    switchLabel: "Need an account?",
    switchCta: "Sign up",
    switchTo: "/signup",
    imageBadge: "Secure access.",
  },
  signup: {
    badge: "Launch your school OS",
    cardTitle: "Create account",
    cardDescription: "Start your workspace.",
    switchLabel: "Already have an account?",
    switchCta: "Log in",
    switchTo: "/login",
    imageBadge: "Fast setup.",
  },
}

interface TemplateProps {
  title: React.ReactNode
  subtitle: React.ReactNode
  image: string | { src: string }
  formType: "login" | "signup"
  eyebrow?: string
}

function Template({ eyebrow, title, subtitle, image, formType }: TemplateProps) {
  const { loading } = useSelector((state: RootState) => state.auth)
  const content = contentByType[formType]
  
  // Need to correctly get image source if it's an object with src
  const imageSrc = typeof image === "object" && image !== null && "src" in image ? image.src : (image as string)

  return (
    // Follows the site theme. It used to be pinned dark, which meant the
    // login and signup pages — the two most-visited pages in the app — sat
    // as a dark slab under a light navbar. The glass surfaces below now use
    // the semantic `hairline`/`glass` tokens (globals.css) rather than
    // `white/10`, which is what made a light version impossible before.
    <section className="relative isolate overflow-hidden bg-richblack-900">
      {/* Accent glows. These are tinted light, so they read as a soft wash on
          either ground — no theme branch needed. */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(195,235,250,0.18),_transparent_28%)]" />
      <div className="absolute inset-y-0 right-0 w-[45%] bg-[radial-gradient(circle_at_center,_rgba(250,226,124,0.14),_transparent_58%)]" />
      {/* The grid uses currentColor via the hairline token so it stays a
          hairline in both themes instead of disappearing on light. */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(var(--hairline) / calc(var(--hairline-alpha) * 0.6)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--hairline) / calc(var(--hairline-alpha) * 0.6)) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      {loading ? (
        <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
          <Spinner />
        </div>
      ) : (
        <div className="relative mx-auto grid min-h-[calc(100vh-3.5rem)] w-full max-w-7xl grid-cols-1 gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:px-10 lg:py-14">
          <div className="order-2 flex flex-col justify-center lg:order-1">
            <div className="mb-6 inline-flex max-w-max items-center rounded-full border border-hairline bg-glass px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-richblack-100 backdrop-blur-xl">
              {eyebrow || content.badge}
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-tighter text-richblack-5 sm:text-6xl lg:text-7xl xl:text-[5.4rem]">
              {title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-richblack-100 sm:text-lg">
              {subtitle}
            </p>

            <div className="mt-8 overflow-hidden rounded-[32px] border border-hairline bg-richblack-800/70 shadow-[0_28px_90px_rgb(var(--shadow-color)/var(--shadow-alpha))]">
              <div className="relative">
                {/* Scrim over the photograph. It has to stay dark in both
                    themes — the image underneath does not change, and the
                    caption below sits on it. */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#020617] via-transparent to-[#c3ebfa]/10" />
                <Image
                  src={imageSrc}
                  alt="Students using IntelleCraft"
                  width={558}
                  height={504}
                  className="h-[280px] w-full object-cover opacity-90 sm:h-[340px]"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
                {/* Sits ON the photograph, so it is pinned dark along with it. */}
                <div data-theme="dark" className="absolute inset-x-5 bottom-5 rounded-[26px] border border-hairline bg-richblack-900/80 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
                  <div className="flex items-start gap-3 text-sm font-semibold text-richblack-100">
                    <AiOutlineArrowRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#fae27c]" />
                    <span>{content.imageBadge}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 flex items-center lg:order-2">
            <div className="w-full rounded-[36px] border border-hairline bg-richblack-800/75 p-6 shadow-[0_35px_120px_rgb(var(--shadow-color)/var(--shadow-alpha))] backdrop-blur-2xl sm:p-8">
              <div className="mb-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-richblack-5 sm:text-4xl">
                    {content.cardTitle}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-richblack-200 sm:text-base">
                    {content.cardDescription}
                  </p>
                </div>
              </div>

              <div className="mb-8 flex gap-3 rounded-full border border-hairline bg-richblack-900/70 p-1">
                <Link
                  to="/login"
                  className={`flex-1 rounded-full px-4 py-3 text-center text-sm font-semibold transition-all ${
                    formType === "login"
                      ? "bg-richblack-5 text-richblack-900 shadow-[0_12px_30px_rgb(var(--shadow-color)/0.18)]"
                      : "text-richblack-300 hover:text-richblack-5"
                  }`}
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className={`flex-1 rounded-full px-4 py-3 text-center text-sm font-semibold transition-all ${
                    formType === "signup"
                      ? "bg-richblack-5 text-richblack-900 shadow-[0_12px_30px_rgb(var(--shadow-color)/0.18)]"
                      : "text-richblack-300 hover:text-richblack-5"
                  }`}
                >
                  Sign up
                </Link>
              </div>

              {formType === "signup" ? <SignupForm /> : <LoginForm />}

              <div className="mt-8 rounded-[28px] border border-hairline bg-glass p-5">
                <p className="text-sm text-richblack-200">
                  {content.switchLabel}{" "}
                  <Link
                    to={content.switchTo}
                    className="font-semibold link-accent underline-offset-4 transition hover:underline"
                  >
                    {content.switchCta}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Template
