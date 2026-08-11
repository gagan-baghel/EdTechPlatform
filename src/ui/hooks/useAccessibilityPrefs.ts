"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "accessibilityPrefs"

export type FontScale = "normal" | "large" | "x-large"

export interface AccessibilityPrefs {
  reducedMotion: boolean
  fontScale: FontScale
}

function readStored(): AccessibilityPrefs {
  if (typeof window === "undefined") return { reducedMotion: false, fontScale: "normal" }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AccessibilityPrefs) : { reducedMotion: false, fontScale: "normal" }
  } catch {
    return { reducedMotion: false, fontScale: "normal" }
  }
}

/**
 * Client-only accessibility settings (plan §4/§5) — reduced motion and
 * text size. Applied as classes on <html> so globals.css can key off them
 * with plain CSS, no per-component wiring needed. No backend: these are
 * rendering preferences, not data anyone else needs to see.
 */
export function useAccessibilityPrefs() {
  const [prefs, setPrefs] = useState(readStored)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("a11y-reduced-motion", prefs.reducedMotion)
    root.classList.remove("a11y-font-large", "a11y-font-x-large")
    if (prefs.fontScale === "large") root.classList.add("a11y-font-large")
    if (prefs.fontScale === "x-large") root.classList.add("a11y-font-x-large")

    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs])

  return {
    reducedMotion: prefs.reducedMotion,
    setReducedMotion: (value: boolean) =>
      setPrefs((p) => ({ ...p, reducedMotion: value })),
    fontScale: prefs.fontScale,
    setFontScale: (value: FontScale) =>
      setPrefs((p) => ({ ...p, fontScale: value })),
  }
}
