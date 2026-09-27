import "./globals.css"
import AppShell from "../ui/layout/AppShell"
import AppProviders from "../ui/providers/AppProviders"
import { geist, geistMono } from "../ui/fonts"
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
    // The image comes from app/opengraph-image.tsx.
  },
  twitter: {
    card: "summary_large_image",
    title: "IntelleCraft — Learn without limits",
    description: DESCRIPTION,
  },
}

export const viewport = {
  themeColor: "#0f0f0e",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * suppressHydrationWarning: ThemeProvider sets `data-theme` on <html>
     * after mount for users who chose a theme that differs from their OS.
     * Scoped to this element's attributes only.
     *
     * There is deliberately NO theme boot script. React 19 refuses to execute
     * a <script> rendered inside the component tree, and next/script's
     * `beforeInteractive` in the App Router produced a hydration mismatch that
     * broke the page outright — the script shipped and never ran. The default
     * theme now comes from `prefers-color-scheme` in CSS (globals.css), which
     * needs no JavaScript, cannot desync from the server render, and keeps
     * every page statically prerenderable.
     */
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:bg-yellow-50 focus:px-4 focus:py-2 focus:font-semibold focus:text-on-signal"
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
