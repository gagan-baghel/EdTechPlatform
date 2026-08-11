import type { ApiFailure } from "@/types/api"
import type { DataBody } from "../types"
import { apiConnector } from "./apiconnector"
import { categories, ratingsEndpoints } from "./apis"

let categoriesCache: CategoryOption[] | null = null
let categoriesPromise: Promise<CategoryOption[]> | null = null
let reviewsCache: unknown[] | null = null
let reviewsPromise: Promise<unknown[]> | null = null

function canUseStorage() {
  return typeof window !== "undefined"
}

function readSessionJson(key: string) {
  if (!canUseStorage()) return null

  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSessionJson(key: string, value: unknown) {
  if (!canUseStorage()) return

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage write failures.
  }
}

export interface CategoryOption {
  _id: string
  name: string
  description?: string
}

export async function fetchCategoriesCached(
  forceRefresh = false
): Promise<CategoryOption[]> {
  if (!forceRefresh) {
    if (categoriesCache) return categoriesCache

    const stored = readSessionJson("intellecraft.categories")
    if (stored) {
      categoriesCache = stored as CategoryOption[]
      return categoriesCache
    }

    if (categoriesPromise) return categoriesPromise
  }

  categoriesPromise = apiConnector<DataBody<CategoryOption[]> | ApiFailure>(
    "GET",
    categories.CATEGORIES_API
  )
    .then((response) => {
      const data = response.data.success ? response.data.data : []
      categoriesCache = data
      writeSessionJson("intellecraft.categories", data)
      return data
    })
    .finally(() => {
      categoriesPromise = null
    })

  return categoriesPromise!
}

export async function fetchReviewsCached(forceRefresh = false): Promise<unknown[]> {
  if (!forceRefresh) {
    if (reviewsCache) return reviewsCache

    const stored = readSessionJson("intellecraft.reviews")
    if (Array.isArray(stored)) {
      reviewsCache = stored as unknown[]
      return stored as unknown[]
    }

    if (reviewsPromise) return reviewsPromise
  }

  reviewsPromise = apiConnector("GET", ratingsEndpoints.REVIEWS_DETAILS_API)
    .then((response) => {
      const raw = response as { data?: { success?: boolean; data?: unknown } }
      const data =
        raw?.data?.success && Array.isArray(raw?.data?.data)
          ? (raw.data.data as unknown[])
          : []
      reviewsCache = data
      writeSessionJson("intellecraft.reviews", data)
      return data
    })
    .finally(() => {
      reviewsPromise = null
    })

  return reviewsPromise!
}
