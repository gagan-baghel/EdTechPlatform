"use client"

import React, { useEffect, useRef, useState } from "react"
import { Provider, useDispatch, useSelector } from "react-redux"
import { configureStore } from "@reduxjs/toolkit"
import { Toaster } from "react-hot-toast"

import rootReducer from "../reducer"
import { hydrateToken, readStoredToken } from "../slices/authSlice"
import { hydrateUser, readStoredUser } from "../slices/profileSlice"
import { hydrateCart, readStoredCart } from "../slices/cartSlice"
import type { RootState, AppDispatch } from "../store"
import { useNavigate } from "../lib/router"
import { getUserDetails } from "../services/operations/profileAPI"
import { useAccessibilityPrefs } from "../hooks/useAccessibilityPrefs"
import LocaleProvider from "./LocaleProvider"
import ThemeProvider from "./ThemeProvider"

// Applies the stored reduced-motion/font-size preference on every page
// load, not just while Settings happens to be mounted — the hook's
// localStorage read + class-toggle effect needs to run once at the root.
function AccessibilityBootstrap(): null {
  useAccessibilityPrefs()
  return null
}

// Captures ?ref=CODE from any landing URL, root-level so it works no
// matter which page a referral link points at (a course page, the
// homepage, etc). Stored for consumption after signup/login — see
// authAPI.js's login(), where setReferrer actually gets called once a
// token exists. Only stores; never overwrites an already-pending code, so
// clicking a second referral link before signing up doesn't reassign
// attribution.
function ReferralCapture(): null {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get("ref")
    if (ref && !localStorage.getItem("pendingReferralCode")) {
      localStorage.setItem("pendingReferralCode", ref.toUpperCase())
    }
  }, [])
  return null
}

function makeStore() {
  return configureStore({
    reducer: rootReducer,
  })
}

// Inferred from store
type AppStore = ReturnType<typeof makeStore>
// We'll export this just in case, though the prompt asked to import AppDispatch from @reduxjs/toolkit

/**
 * Applies persisted auth/profile/cart state after mount.
 *
 * The slices deliberately start empty so the client's hydration render matches
 * the server's — see the note in each slice. This is where the stored values
 * are put back, one render later. The cost is a single frame showing the
 * signed-out navbar; the alternative was a hydration failure on every page,
 * which made React throw away the server HTML entirely.
 */
function StoreHydration(): null {
  const dispatch = useDispatch<AppDispatch>()
  const hydrated = useRef(false)

  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    dispatch(hydrateToken(readStoredToken()))
    dispatch(hydrateUser(readStoredUser()))
    dispatch(hydrateCart(readStoredCart()))
  }, [dispatch])

  return null
}

function AuthBootstrap(): null {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const token = useSelector((state: RootState) => state.auth.token)
  const user = useSelector((state: RootState) => state.profile.user)
  const fetchedTokenRef = useRef<string | null>(null)

  useEffect(() => {
    if (!token || fetchedTokenRef.current === token) return

    const loadUser = () => {
      fetchedTokenRef.current = token
      dispatch(getUserDetails(token, navigate))
    }

    if (user) {
      const canIdle = typeof window !== "undefined" && "requestIdleCallback" in window
      const handle = canIdle
        ? window.requestIdleCallback(() => loadUser(), { timeout: 1500 })
        : window.setTimeout(loadUser, 1200)

      return () => {
        if (canIdle) {
          window.cancelIdleCallback(handle)
        } else {
          window.clearTimeout(handle)
        }
      }
    }

    loadUser()
  }, [dispatch, navigate, token, user])

  return null
}

export default function AppProviders({ children }: { children: React.ReactNode }): React.JSX.Element {
  // Initialized directly with useState so the store is created exactly once 
  // (on the first render). This avoids the React Compiler "Cannot access 
  // refs during render" error that occurs when reading storeRef.current.
  const [store] = useState<AppStore>(() => makeStore())

  return (
    <Provider store={store}>
      <ThemeProvider>
        <LocaleProvider>
          <StoreHydration />
          <AuthBootstrap />
          <AccessibilityBootstrap />
          <ReferralCapture />
          {children}
          <Toaster />
        </LocaleProvider>
      </ThemeProvider>
    </Provider>
  )
}
