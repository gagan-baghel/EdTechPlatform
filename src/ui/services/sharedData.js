import { apiConnector } from "./apiconnector"
import { categories, ratingsEndpoints } from "./apis"

let categoriesCache = null
let categoriesPromise = null
let reviewsCache = null
let reviewsPromise = null

function canUseStorage() {
  return typeof window !== "undefined"
}

function readSessionJson(key) {
  if (!canUseStorage()) return null

  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (_error) {
    return null
  }
}

function writeSessionJson(key, value) {
  if (!canUseStorage()) return

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch (_error) {
    // Ignore storage write failures.
  }
}

export async function fetchCategoriesCached(forceRefresh = false) {
  if (!forceRefresh) {
    if (categoriesCache) return categoriesCache

    const stored = readSessionJson("intellecraft.categories")
    if (stored) {
      categoriesCache = stored
      return stored
    }

    if (categoriesPromise) return categoriesPromise
  }

  categoriesPromise = apiConnector("GET", categories.CATEGORIES_API)
    .then((response) => {
      const data = Array.isArray(response?.data?.data) ? response.data.data : []
      categoriesCache = data
      writeSessionJson("intellecraft.categories", data)
      return data
    })
    .finally(() => {
      categoriesPromise = null
    })

  return categoriesPromise
}

export async function fetchReviewsCached(forceRefresh = false) {
  if (!forceRefresh) {
    if (reviewsCache) return reviewsCache

    const stored = readSessionJson("intellecraft.reviews")
    if (Array.isArray(stored)) {
      reviewsCache = stored
      return stored
    }

    if (reviewsPromise) return reviewsPromise
  }

  reviewsPromise = apiConnector("GET", ratingsEndpoints.REVIEWS_DETAILS_API)
    .then((response) => {
      const data =
        response?.data?.success && Array.isArray(response?.data?.data)
          ? response.data.data
          : []
      reviewsCache = data
      writeSessionJson("intellecraft.reviews", data)
      return data
    })
    .finally(() => {
      reviewsPromise = null
    })

  return reviewsPromise
}
