import type { ApiFailure } from "@/types/api"
import type { DataBody } from "../../types"
import { apiConnector } from "../apiconnector"
import { catalogData } from "../apis"

export const getCatalogaPageData = async <TData = Record<string, unknown>>(
  categoryId: string
) => {
  let result: TData | null = null
  try {
    const response = await apiConnector<DataBody<TData> | ApiFailure>(
      "POST",
      catalogData.CATALOGPAGEDATA_API,
      { categoryId }
    )

    if (!response.data.success) {
      throw new Error("Could not Fetch Category page data")
    }

    result = response.data.data
  } catch (error) {
    // Was `result = error.response.data` — that handed the server's ERROR
    // body back as if it were catalogue data, so a failed request rendered
    // an error payload into the page instead of the empty state.
    console.error("getCatalogaPageData failed", error)
    result = null
  }
  return result
}
