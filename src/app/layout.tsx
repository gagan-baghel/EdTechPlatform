import "./globals.css"
import AppShell from "../ui/layout/AppShell"
import AppProviders from "../ui/providers/AppProviders"
import { resolveSiteUrl } from "../ui/utils/siteUrl"

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
