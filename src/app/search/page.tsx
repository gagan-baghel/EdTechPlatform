import { Suspense } from "react"
import Search from "../../ui/pages/Search"
import Spinner from "../../ui/components/common/Spinner"

export const metadata = {
  title: "Search",
  description: "Search the IntelleCraft course catalog.",
  // Search result pages (query-dependent, no stable canonical content) are
  // not what should show up in search results — the catalog and course
  // detail pages are. Indexing every ?q= permutation is noise, not reach.
  robots: { index: false, follow: true },
}

// useSearchParams requires a Suspense boundary during prerender.
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-richblack-900">
          <Spinner />
        </div>
      }
    >
      <Search />
    </Suspense>
  )
}
