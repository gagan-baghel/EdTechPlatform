import { ImageResponse } from "next/og"

import { BRAND_MARK_PATH } from "../ui/components/common/Brand"

/**
 * The card shown when a link to the site is shared. Generated at build time
 * by Next's file convention — it replaces the logo PNG, whose white square
 * made every preview look like a placeholder.
 */
export const alt = "IntelleCraft — Learn it properly. Prove it."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const MARK = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#f2f2ee" fill-rule="evenodd" d="${BRAND_MARK_PATH}"/></svg>`
)}`

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 72,
          background: "#0f0f0e",
          color: "#f2f2ee",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* As a data URI: next/og's renderer rejects the inline <svg> form. */}
          <img width={64} height={64} alt="" src={MARK} />
          <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>IntelleCraft</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 104, fontWeight: 700, letterSpacing: -5, lineHeight: 1 }}>Learn it properly.</span>
          <span style={{ fontSize: 104, fontWeight: 700, letterSpacing: -5, lineHeight: 1.05, color: "#8199ff" }}>
            Prove it.
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#95958f" }}>
          <span>Courses · quizzes · scorecards · certificates</span>
          <span>English · Hindi</span>
        </div>
      </div>
    ),
    size
  )
}
