"use client"

import { useState } from "react"

const STORAGE_KEY = "displayCurrency"

// Persisted across pages so picking a currency once on a course card
// applies everywhere else too, instead of resetting on every navigation.
export function useCurrencyPreference(): [string, (value: string) => void] {
  // Lazy initializer — reads localStorage once on mount without a separate
  // effect that calls setState, which triggers a cascading second render.
  const [currency, setCurrencyState] = useState(() => {
    if (typeof window === "undefined") return ""
    return localStorage.getItem(STORAGE_KEY) ?? ""
  })

  const setCurrency = (value: string) => {
    setCurrencyState(value)
    if (value) {
      localStorage.setItem(STORAGE_KEY, value)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return [currency, setCurrency]
}
