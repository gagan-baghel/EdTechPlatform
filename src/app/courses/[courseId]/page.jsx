import CourseDetails from "../../../ui/pages/CourseDetails"
import { resolveSiteUrl } from "../../../ui/utils/siteUrl"

// Revalidate hourly — course name/description/price change rarely enough
// that per-request DB hits for metadata alone aren't worth it, but a
// day-old title after a price change is also wrong long enough to matter.
export const revalidate = 3600

/**
 * Lightweight, metadata-only fetch — deliberately NOT the full course
 * content (sections/lectures/reviews) the client component fetches for
 * itself. Duplicating that whole query here just to read a title and
 * description would mean fetching every course's full content tree twice
 * per request for no benefit; the client fetch already exists and stays
 * exactly as it was.
 */
async function getCourseForMetadata(courseId) {
  try {
    const { connectDB } = await import("../../../api/config/connectDB")
    const Course = (await import("../../../api/models/Course")).default
    await connectDB()

    const course = await Course.findOne(
      { _id: courseId, status: "Published", deletedAt: null },
      { courseName: 1, courseDescription: 1, thumbnail: 1, price: 1, instructor: 1, createdAt: 1, updatedAt: 1 }
    )
      .populate("instructor", "firstName lastName")
      .lean()

    return course
  } catch (error) {
    // Metadata is best-effort — a DB hiccup here must fall back to
    // generic metadata, never break the page itself.
    console.error("getCourseForMetadata failed", error)
    return null
  }
}

export async function generateMetadata({ params }) {
  const course = await getCourseForMetadata(params.courseId)

  if (!course) {
    return { title: "Course" }
  }

  const description = course.courseDescription?.slice(0, 155) || "View this course on IntelleCraft."
  const siteUrl = resolveSiteUrl()
  const canonical = `${siteUrl}/courses/${params.courseId}`

  return {
    title: course.courseName,
    description,
    alternates: { canonical },
    openGraph: {
      title: course.courseName,
      description,
      url: canonical,
      type: "website",
      images: course.thumbnail ? [{ url: course.thumbnail }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: course.courseName,
      description,
      images: course.thumbnail ? [course.thumbnail] : undefined,
    },
  }
}

export default async function CourseDetailsPage({ params }) {
  const course = await getCourseForMetadata(params.courseId)

  // JSON-LD Course structured data — https://schema.org/Course. Only
  // rendered when the metadata fetch actually succeeded; a null course
  // here means either it doesn't exist or isn't published, and the page
  // body's own client-side fetch already handles that case with a real
  // not-found UI — this script tag isn't the place to duplicate that.
  const jsonLd = course
    ? {
        "@context": "https://schema.org",
        "@type": "Course",
        name: course.courseName,
        description: course.courseDescription,
        provider: {
          "@type": "Organization",
          name: "IntelleCraft",
          sameAs: resolveSiteUrl(),
        },
        ...(course.instructor && {
          instructor: {
            "@type": "Person",
            name: `${course.instructor.firstName} ${course.instructor.lastName}`,
          },
        }),
        ...(course.price !== undefined && course.price !== null && {
          offers: {
            "@type": "Offer",
            price: course.price,
            priceCurrency: "INR",
            availability: "https://schema.org/InStock",
          },
        }),
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // courseName/courseDescription are instructor-supplied. Without
          // escaping "<", a description containing "</script><script>..."
          // would break out of this tag and execute — the standard
          // JSON-LD XSS vector.
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <CourseDetails />
    </>
  )
}
