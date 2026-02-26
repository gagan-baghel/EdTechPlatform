"use client"

import { useEffect, useRef } from "react"
import { Provider, useDispatch } from "react-redux"
import { configureStore } from "@reduxjs/toolkit"
import { Toaster } from "react-hot-toast"

import rootReducer from "../reducer"
import { useNavigate } from "../lib/router"
import { getUserDetails } from "../services/operations/profileAPI"

function makeStore() {
  return configureStore({
    reducer: rootReducer,
  })
}

function AuthBootstrap() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    const tokenRaw = localStorage.getItem("token")
    if (!tokenRaw) return

    try {
      const token = JSON.parse(tokenRaw)
      dispatch(getUserDetails(token, navigate))
    } catch (_error) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    }
  }, [dispatch, navigate])

  return null
}

export default function AppProviders({ children }) {
  const storeRef = useRef(null)

  if (!storeRef.current) {
    storeRef.current = makeStore()
  }

  return (
    <Provider store={storeRef.current}>
      <AuthBootstrap />
      {children}
      <Toaster />
    </Provider>
  )
}
