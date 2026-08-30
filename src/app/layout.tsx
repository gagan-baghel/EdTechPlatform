import Script from "next/script"

import "./globals.css"
import AppShell from "../ui/layout/AppShell"
import AppProviders from "../ui/providers/AppProviders"
import { resolveSiteUrl } from "@/lib/siteUrl"

const SITE_URL = resolveSiteUrl()
const DESCRIPTION =
  "Learn in-demand skills from expert instructors. Browse courses, learn at your own pace, and track your progress on IntelleCraft."

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "IntelleCraft — Learn without limits",
    template: "%s | IntelleCraft",
  },
  description: DESCRIPTION,
  icons: { icon: "/logo.png", apple: "/logo.png" },
  openGraph: {
    title: "IntelleCraft — Learn without limits",
    description: DESCRIPTION,
    siteName: "IntelleCraft",
    type: "website",
    url: SITE_URL,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "IntelleCraft" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "IntelleCraft — Learn without limits",
    description: DESCRIPTION,
    images: ["/logo.png"],
  },
}

export const viewport = {
  themeColor: "#000814",
  width: "device-width",
  initialScale: 1,
}

/**
 * Runs before first paint, in the document head.
 *
 * Two jobs, both of which have to happen before the browser paints anything:
 *
 *  1. Apply the stored theme. ThemeProvider can only do this in an effect,
 *     which is after hydration — so every single page load flashed the dark
 *     palette at light-mode users before snapping over. Applying it here means
 *     the first painted frame is already correct.
 *
 *  2. Mark that scripting is alive. The scroll-reveal animation hides content
 *     until it scrolls into view, which is only safe if something is
 *     guaranteed to reveal it — with JS disabled or broken, `.reveal` would
 *     leave the entire page blank. The hidden state is scoped to `html.js`, so
 *     without this line the page renders as plain, fully visible content.
 *
 * Kept as a string on purpose: it must be inline and synchronous. Anything
 * loaded as a module runs after paint, which is the whole problem.
 */
const BOOT_SCRIPT = `(function(){try{
var t=localStorage.getItem("theme");
if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}
document.documentElement.setAttribute("data-theme",t);
}catch(e){document.documentElement.setAttribute("data-theme","dark")}
document.documentElement.classList.add("js")})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the boot script above mutates <html>'s
    // attributes before React hydrates, which React would otherwise report as
    // a server/client mismatch. It is the intended behaviour, and it is scoped
    // to this element only.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* next/script rather than a bare <script>: React 19 warns that a
            script rendered inside a component tree is never executed on the
            client, and `beforeInteractive` is the documented way to get an
            inline script into the initial HTML ahead of hydration. */}
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }}
        />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-yellow-50 focus:px-4 focus:py-2 focus:font-semibold focus:text-ink"
        >
          Skip to content
        </a>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  )
}
