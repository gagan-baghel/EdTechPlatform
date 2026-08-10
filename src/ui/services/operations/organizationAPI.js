import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { organizationEndpoints } from "../apis"

const { CREATE_ORG_API, MY_ORGS_API, JOIN_ORG_API } = organizationEndpoints
const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

export async function fetchMyOrganizations(token) {
  try {
    const response = await apiConnector("GET", MY_ORGS_API, null, authHeader(token))
    return response.data?.success ? response.data.data : []
  } catch (error) {
    toast.error("Could not load organizations")
    return []
  }
}

export async function createOrganization(token, payload) {
  try {
    const response = await apiConnector("POST", CREATE_ORG_API, payload, authHeader(token))
    if (!response.data.success) throw new Error(response.data.message)
    toast.success("Organization created")
    return response.data.data
  } catch (error) {
    toast.error(error.message || "Could not create organization")
    return null
  }
}

export async function joinOrganization(token, inviteCode) {
  try {
    const response = await apiConnector("POST", JOIN_ORG_API, { inviteCode }, authHeader(token))
    if (!response.data.success) throw new Error(response.data.message)
    toast.success(response.data.message)
    return response.data.data
  } catch (error) {
    toast.error(error?.response?.data?.message || error.message || "Could not join organization")
    return null
  }
}
