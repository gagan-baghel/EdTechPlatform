import { apiConnector } from "../apiconnector"
import { catalogData } from "../apis"

export const getCatalogaPageData = async(categoryId) => {
  let result = []
  try{
        const response = await apiConnector("POST", catalogData.CATALOGPAGEDATA_API, 
        {categoryId: categoryId,})

        if(!response?.data?.success)
            throw new Error("Could not Fetch Category page data")

         result = response?.data

  }
  catch(error) {
    result = error.response?.data
  }
  return result
}
