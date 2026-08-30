import { type MetadataRoute } from 'next'
import { resolveSiteUrl } from "@/lib/siteUrl"

// Next.js App Router convention: a default export here becomes /sitemap.xml
// automatically — no route file, no XML building by hand.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = resolveSiteUrl()

  const staticRoutes = ["", "/about", "/contact", "/login", "/signup"].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }))

  let courseRoutes = []
  let catalogRoutes = []

  try {
    const { connectDB } = await import("../api/config/connectDB")
    const Course = (await import("../api/models/Course")).default
    const Category = (await import("../api/models/Category")).default
    await connectDB()

    const courses = await Course.find(
      { status: "Published", deletedAt: null },
      { _id: 1, updatedAt: 1 }
    ).lean()

    courseRoutes = courses.map((course: { _id: unknown; updatedAt?: Date }) => ({
      url: `${siteUrl}/courses/${course._id}`,
      lastModified: course.updatedAt || new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }))

    const categories = await Category.find({}, { name: 1 }).lean()
    catalogRoutes = categories.map((category: { name: string }) => ({
      url: `${siteUrl}/catalog/${category.name.split(" ").join("-").toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }))
  } catch (error) {
    // A sitemap that's briefly incomplete during a DB hiccup is fine —
    // failing the route entirely because dynamic content couldn't be
    // fetched would drop even the static pages from the sitemap, which is
    // strictly worse than serving what's known-good.
    console.error("sitemap: failed to load dynamic routes", error)
  }

  return [...staticRoutes, ...courseRoutes, ...catalogRoutes]
}
