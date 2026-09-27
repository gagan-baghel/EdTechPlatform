import { Geist, Geist_Mono } from "next/font/google"

/**
 * The dashboard typefaces: Geist for reading, Geist Mono for anything that is
 * data — figures, labels, ids, axis ticks. Loaded through next/font, so they
 * are self-hosted at build time and there is no third-party request at runtime.
 *
 * Exposed as CSS variables (applied to <html> while a dashboard is mounted —
 * see ui/pages/Dashboard.tsx) and as family names for the chart canvas, which
 * can't read CSS variables.
 */
export const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" })
export const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" })
