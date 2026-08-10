"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "displayCurrency"

// Persisted across pages so picking a currency once on a course card
// applies everywhere else too, instead of resetting on every navigation.
export function useCurrencyPreference() {
  const [currency, setCurrencyState] = useState("")

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setCurrencyState(stored)
  }, [])

  const setCurrency = (value) => {
    setCurrencyState(value)
    if (value) {
      localStorage.setItem(STORAGE_KEY, value)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return [currency, setCurrency]
}
