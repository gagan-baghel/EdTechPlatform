import Catalog from "../../../ui/pages/Catalog"
import { resolveSiteUrl } from "../../../ui/utils/siteUrl"

export const revalidate = 3600
const slugify = (name: string) => name.split(" ").join("-").toLowerCase()

/**
 * Same slug scheme Catalog.jsx already uses client-side (category.name
 * with spaces replaced by hyphens, lowercased) — matched here server-side
 * so metadata can be generated without duplicating a client-only fetch.
 */
async function getCategoryForMetadata(catalogName: string) {
  try {
    const { connectDB } = await import("../../../api/config/connectDB")
    const Category = (await import("../../../api/models/Category")).default
    await connectDB()

    const categories = await Category.find({}, { name: 1, description: 1 }).lean()
    return categories.find((category: { name: string }) => slugify(category.name) === catalogName) || null
  } catch (error) {
    console.error("getCategoryForMetadata failed", error)
    return null
  }
}

export async function generateMetadata({ params }: { params: { catalogName: string } }) {
  const category = await getCategoryForMetadata(params.catalogName)

  if (!category) {
    return { title: "Catalog" }
  }

  const description =
    category.description?.slice(0, 155) ||
    `Browse ${category.name} courses on IntelleCraft.`
  const canonical = `${resolveSiteUrl()}/catalog/${params.catalogName}`

  return {
    title: category.name,
    description,
    alternates: { canonical },
    openGraph: { title: category.name, description, url: canonical, type: "website" },
    twitter: { card: "summary", title: category.name, description },
  }
}

export default function CatalogPage() {
  return <Catalog />
}
