import "./globals.css"
import AppShell from "../ui/layout/AppShell"
import AppProviders from "../ui/providers/AppProviders"

export const metadata = {
  title: "IntelleCraft",
  description: "EdTech platform powered by Next.js",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  )
}
