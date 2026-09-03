import { type MetadataRoute } from "next"
import { resolveSiteUrl } from "@/lib/siteUrl"

// Next.js App Router convention: a default export here becomes /robots.txt.
// Same origin resolver as sitemap.ts, so the two can never disagree.
export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl()

  return {
    rules: {
      userAgent: "*",
      // Signed-in surfaces only. Crawling them yields login redirects at best
      // and indexes one-time reset/verify tokens at worst.
      disallow: [
        "/api/",
        "/dashboard",
        "/view-course",
        "/onboarding",
        "/update-password",
        "/verify-email",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
