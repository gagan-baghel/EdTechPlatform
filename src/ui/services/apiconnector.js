import axios from "axios"

export const axiosInstance = axios.create({
  withCredentials: true,
  timeout: 30000,
})

export const apiConnector = (method, url, bodyData, headers, params) => {
  const requestConfig = {
    method: `${method}`,
    url: `${url}`,
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

  return axiosInstance(requestConfig)
}
