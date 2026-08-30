"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react"

export type Theme = "dark" | "light"

export interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  /** True while the user has expressed no preference and is following the OS. */
  followsSystem: boolean
}

const STORAGE_KEY = "theme"
const CHANGE_EVENT = "themechange"

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
  followsSystem: true,
})

/**
 * The `data-theme` attribute on <html> is the single source of truth.
 *
 * Three things write it — the boot script in `app/layout.tsx` (before first
 * paint), the user toggling, and the OS preference changing — so rather than
 * mirroring it into React state and trying to keep the two in step, React
 * subscribes to it. `useSyncExternalStore` is exactly the primitive for that:
 * it gives a separate server snapshot (so SSR is stable) and re-reads on
 * notification, with no setState during an effect and no chance of the DOM and
 * the rendered tree disagreeing.
 *
 * The previous version read localStorage inside a `useState` initializer,
 * which runs during hydration: a light-mode user hydrated a tree that said
 * "light" against server HTML that said "dark", and the toggle icon mismatched.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange)

  // Covers the OS flipping, and any write to the attribute from outside React.
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  })

  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    observer.disconnect()
  }
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark"
}

/** Matches what the server renders, and what the boot script defaults to. */
function getServerSnapshot(): Theme {
  return "dark"
}

function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange)
  // Another tab choosing a theme should not silently desync this one.
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

function readFollowsSystem(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === null
  } catch {
    return true
  }
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const followsSystem = useSyncExternalStore(
    subscribeToStorage,
    readFollowsSystem,
    () => true
  )

  // Track the OS setting for as long as the user has not overridden it.
  // Without this, someone whose system flips to dark at sunset keeps the light
  // palette until they reload. Writing the attribute notifies the store above.
  useEffect(() => {
    if (!followsSystem) return

    const query = window.matchMedia("(prefers-color-scheme: light)")
    const apply = () => {
      document.documentElement.setAttribute(
        "data-theme",
        query.matches ? "light" : "dark"
      )
    }

    query.addEventListener("change", apply)
    return () => query.removeEventListener("change", apply)
  }, [followsSystem])

  /**
   * Writes go straight to the DOM and localStorage, then notify — never a
   * `useEffect` on [theme]. A reactive write-on-change effect also fires on
   * mount using that render's closure, and under StrictMode's double
   * invocation it clobbers the stored preference back to the default, which
   * permanently stomped a stored "light". LocaleProvider avoids the same trap
   * the same way.
   */
  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Private browsing or a full quota: the theme still applies to this page
      // view, only remembering it fails. Not worth surfacing.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [setTheme, theme]
  )

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, followsSystem }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext)
}
