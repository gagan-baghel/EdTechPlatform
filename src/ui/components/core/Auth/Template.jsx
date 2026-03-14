import Image from "next/image"
import { useSelector } from "react-redux"
import { AiOutlineArrowRight } from "react-icons/ai"
import { Link } from "@/ui/lib/router"

import LoginForm from "./LoginForm"
import SignupForm from "./SignupForm"

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

function Template({ eyebrow, title, subtitle, image, formType }) {
  const { loading } = useSelector((state) => state.auth)
  const content = contentByType[formType]

  return (
    <section className="relative isolate overflow-hidden bg-richblack-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(195,235,250,0.18),_transparent_28%)]" />
      <div className="absolute inset-y-0 right-0 w-[45%] bg-[radial-gradient(circle_at_center,_rgba(250,226,124,0.1),_transparent_58%)]" />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      {loading ? (
        <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="relative mx-auto grid min-h-[calc(100vh-3.5rem)] w-full max-w-7xl grid-cols-1 gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:px-10 lg:py-14">
          <div className="order-2 flex flex-col justify-center lg:order-1">
            <div className="mb-6 inline-flex max-w-max items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-richblack-100 backdrop-blur-xl">
              {eyebrow || content.badge}
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-tighter text-white sm:text-6xl lg:text-7xl xl:text-[5.4rem]">
              {title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-richblack-100 sm:text-lg">
              {subtitle}
            </p>

            <div className="mt-8 overflow-hidden rounded-[32px] border border-white/10 bg-richblack-800/70 shadow-[0_28px_90px_rgba(0,8,20,0.42)]">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#020617] via-transparent to-[#c3ebfa]/10" />
                <Image
                  src={image?.src || image}
                  alt="Students using IntelleCraft"
                  width={558}
                  height={504}
                  className="h-[280px] w-full object-cover opacity-90 sm:h-[340px]"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
                <div className="absolute inset-x-5 bottom-5 rounded-[26px] border border-white/10 bg-richblack-900/80 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
                  <div className="flex items-start gap-3 text-sm font-semibold text-richblack-100">
                    <AiOutlineArrowRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#fae27c]" />
                    <span>{content.imageBadge}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 flex items-center lg:order-2">
            <div className="w-full rounded-[36px] border border-white/10 bg-richblack-800/75 p-6 shadow-[0_35px_120px_rgba(0,8,20,0.55)] backdrop-blur-2xl sm:p-8">
              <div className="mb-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {content.cardTitle}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-richblack-200 sm:text-base">
                    {content.cardDescription}
                  </p>
                </div>
              </div>

              <div className="mb-8 flex gap-3 rounded-full border border-white/10 bg-richblack-900/70 p-1">
                <Link
                  to="/login"
                  className={`flex-1 rounded-full px-4 py-3 text-center text-sm font-semibold transition-all ${
                    formType === "login"
                      ? "bg-white text-richblack-900 shadow-[0_12px_30px_rgba(255,255,255,0.16)]"
                      : "text-richblack-300 hover:text-richblack-5"
                  }`}
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className={`flex-1 rounded-full px-4 py-3 text-center text-sm font-semibold transition-all ${
                    formType === "signup"
                      ? "bg-white text-richblack-900 shadow-[0_12px_30px_rgba(255,255,255,0.16)]"
                      : "text-richblack-300 hover:text-richblack-5"
                  }`}
                >
                  Sign up
                </Link>
              </div>

              {formType === "signup" ? <SignupForm /> : <LoginForm />}

              <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-richblack-200">
                  {content.switchLabel}{" "}
                  <Link
                    to={content.switchTo}
                    className="font-semibold text-[#c3ebfa] transition hover:text-white"
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
