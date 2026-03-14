"use client"

import { useEffect, useRef } from "react"
import { Provider, useDispatch, useSelector } from "react-redux"
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
  const token = useSelector((state) => state.auth.token)
  const user = useSelector((state) => state.profile.user)
  const fetchedTokenRef = useRef(null)

  useEffect(() => {
    if (!token || fetchedTokenRef.current === token) return

    const loadUser = () => {
      fetchedTokenRef.current = token
      dispatch(getUserDetails(token, navigate))
    }

    if (user) {
      const idleCallback =
        typeof window !== "undefined" && "requestIdleCallback" in window
          ? window.requestIdleCallback(() => loadUser(), { timeout: 1500 })
          : window.setTimeout(loadUser, 1200)

      return () => {
        if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
          window.cancelIdleCallback(idleCallback)
        } else {
          window.clearTimeout(idleCallback)
        }
      }
    }

    loadUser()
  }, [dispatch, navigate, token, user])

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
