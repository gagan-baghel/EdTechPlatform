"use client"

import { createContext, useContext, useEffect, useState } from "react"

const STORAGE_KEY = "theme"
const ThemeContext = createContext({ theme: "dark", setTheme: () => {}, toggleTheme: () => {} })

/**
 * Context, not a bare hook — Navbar's quick toggle and Settings >
 * Appearance both need to read/set the SAME value, not each get their own
 * independent state. Applies data-theme="light"|"dark" on <html>;
 * globals.css's :root[data-theme="light"] override does the rest, since
 * every richblack-* Tailwind color already resolves through CSS variables
 * (see the comment at the top of globals.css). No component needs to
 * change for this to work.
 *
 * Initial state is always "dark" on both server and client's first
 * render — reading localStorage in the useState initializer (as this
 * originally did) reads it synchronously during the CLIENT's first
 * render, which runs before hydration reconciles against the server's
 * markup, and throws a real hydration error (crashed the FiMoon/FiSun
 * icon swap in Navbar.jsx during testing). The stored value is applied a
 * tick later in the effect below, after hydration is done.
 *
 * There is deliberately only ONE effect, and it does not depend on
 * [theme]. A second "write localStorage whenever theme changes" effect
 * (dependent on [theme]) fires on mount too, using that render's
 * "dark" closure — with reactStrictMode's dev-only double effect
 * invocation, that write-on-mount effect clobbers the stored value back
 * to "dark" between the read effect's two invocations, and the second
 * read then re-queues setTheme("dark"), permanently stomping the user's
 * stored "light" preference. Writing only from setTheme/toggleTheme
 * (imperatively, not reactively) avoids the race. Same pattern
 * LocaleProvider.jsx already uses for exactly this reason.
 */
export default function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("dark")

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const resolved = stored === "light" || stored === "dark" ? stored : "dark"
    setThemeState(resolved)
    document.documentElement.setAttribute("data-theme", resolved)
  }, [])

  const setTheme = (next) => {
    setThemeState(next)
    document.documentElement.setAttribute("data-theme", next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark")

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
