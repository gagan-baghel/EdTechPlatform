import React from "react"

import Footer from "./Footer"

export interface LegalSection {
  heading: string
  body: React.ReactNode
}

/**
 * Terms, privacy and refund pages. Every statement in them describes what the
 * code actually does (see the comments in each page) — a policy that promises
 * something the platform doesn't do is worse than no policy.
 */
export default function LegalPage({
  title,
  summary,
  updated,
  sections,
}: {
  title: string
  summary: string
  updated: string
  sections: LegalSection[]
}) {
  return (
    <div className="bg-richblack-900 text-richblack-5">
      <article className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-14 sm:px-6 lg:px-10 lg:pt-20">
        <header className="grid grid-cols-1 gap-6 border-b border-richblack-600 pb-10 lg:grid-cols-[1fr_280px]">
          <div>
            <h1 className="text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.04em] md:text-6xl">{title}</h1>
            <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-richblack-200">{summary}</p>
          </div>
          <p className="stamp self-end text-richblack-400 lg:text-right">Last updated {updated}</p>
        </header>

        <div className="grid grid-cols-1 gap-10 pt-10 lg:grid-cols-[240px_1fr]">
          <nav aria-label="On this page" className="hidden lg:block">
            <ol className="sticky top-24 space-y-2 text-sm">
              {sections.map((section, i) => (
                <li key={section.heading}>
                  <a href={`#s${i + 1}`} className="text-richblack-300 hover:text-richblack-5">
                    <span className="figure mr-2 text-richblack-500">{String(i + 1).padStart(2, "0")}</span>
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="max-w-[72ch]">
            {sections.map((section, i) => (
              <section key={section.heading} id={`s${i + 1}`} className="scroll-mt-24 border-t border-richblack-700 py-8 first:border-t-0 first:pt-0">
                <h2 className="text-xl font-semibold tracking-[-0.02em]">
                  <span className="figure mr-3 text-sm text-richblack-500">{String(i + 1).padStart(2, "0")}</span>
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-4 text-base leading-relaxed text-richblack-200 [&_a]:text-accent [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </article>
      <Footer />
    </div>
  )
}
