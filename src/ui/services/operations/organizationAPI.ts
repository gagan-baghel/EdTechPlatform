import type { ApiFailure } from "@/types/api"
import type { DataBody } from "../../types"
import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { organizationEndpoints } from "../apis"

const { CREATE_ORG_API, MY_ORGS_API, JOIN_ORG_API } = organizationEndpoints
const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` })

export async function fetchMyOrganizations<TOrg = Record<string, unknown>>(token: string) {
  try {
    const response = await apiConnector<DataBody<TOrg[]> | ApiFailure>("GET", MY_ORGS_API, null, authHeader(token))
    return response.data.success ? response.data.data : []
  } catch {
    toast.error("Could not load organizations")
    return []
  }
}

export async function createOrganization(token: string, payload: Record<string, unknown>) {
  try {
    const response = await apiConnector("POST", CREATE_ORG_API, payload, authHeader(token))
    if (!response.data.success) throw new Error(response.data.message)
    toast.success("Organization created")
    return response.data.data
  } catch (error) {
    toast.error((error as Error).message || "Could not create organization")
    return null
  }
}

export async function joinOrganization(token: string, inviteCode: string) {
  try {
    const response = await apiConnector("POST", JOIN_ORG_API, { inviteCode }, authHeader(token))
    if (!response.data.success) throw new Error(response.data.message)
    toast.success(response.data.message as string)
    return response.data.data
  } catch (error) {
    toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || (error as Error).message || "Could not join organization")
    return null
  }
}
