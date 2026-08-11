import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
  type Method,
} from "axios"

import type { ApiResponse } from "@/types/api"

export const axiosInstance = axios.create({
  withCredentials: true,
  timeout: 30000,
})

export type RequestHeaders = Record<string, string>
export type RequestParams = Record<string, string | number | boolean | undefined>

/**
 * The one call site for every API request in the app.
 *
 * Generic over the ENTIRE response body, not just a `data` field. Most
 * endpoints answer with the `{ success, data }` envelope, but several
 * predate it and put their payload at the top level — `/auth/login` returns
 * `{ success, token, user }`. Typing this as `ApiResponse<T>` would have
 * quietly declared those fields nonexistent, so callers name their own body
 * shape and `ApiResponse` stays the default for the ones that do conform.
 */
export function apiConnector<TResponse = ApiResponse<unknown>, TBody = unknown>(
  method: Method,
  url: string,
  bodyData?: TBody,
  headers?: RequestHeaders,
  params?: RequestParams
): Promise<AxiosResponse<TResponse>> {
  const requestConfig: AxiosRequestConfig<TBody> = {
    method,
    url,
    withCredentials: true,
  }

  if (bodyData !== undefined && bodyData !== null) {
    requestConfig.data = bodyData
  }

  if (headers && Object.keys(headers).length > 0) {
    requestConfig.headers = headers
  }

  if (params && Object.keys(params).length > 0) {
    requestConfig.params = params
  }

  return axiosInstance<TResponse>(requestConfig)
}
