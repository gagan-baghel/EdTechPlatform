"use client"

import { useCallback, useEffect } from "react"
import NextLink from "next/link"
import { usePathname, useRouter, useParams as useNextParams } from "next/navigation"

function normalizeSearch(value) {
  if (!value) return ""
  if (typeof value === "string") {
    if (!value) return ""
    return value.startsWith("?") ? value : `?${value}`
  }
  if (typeof value === "object") {
    const params = new URLSearchParams()
    Object.entries(value).forEach(([key, val]) => {
      if (val === undefined || val === null) return
      if (Array.isArray(val)) {
        val.forEach((entry) => params.append(key, String(entry)))
        return
      }
      params.append(key, String(val))
    })
    const serialized = params.toString()
    return serialized ? `?${serialized}` : ""
  }
  return ""
}

function normalizeHash(value) {
  if (!value) return ""
  if (typeof value !== "string") return ""
  return value.startsWith("#") ? value : `#${value}`
}

function normalizeTo(to) {
  if (typeof to === "string") return to
  if (to instanceof URL) return to.pathname + to.search + to.hash
  if (to && typeof to === "object") {
    const pathname = typeof to.pathname === "string" ? to.pathname : "/"
    const search = normalizeSearch(to.search || to.query)
    const hash = normalizeHash(to.hash)
    return `${pathname}${search}${hash}`
  }
  return "/"
}

export function Link({ to, href, children, ...props }) {
  const nextHref = href ?? normalizeTo(to)
  return (
    <NextLink href={nextHref} {...props}>
      {children}
    </NextLink>
  )
}

export function NavLink({ to, className, children, ...props }) {
  const location = useLocation()
  const isActive = Boolean(matchPath({ path: normalizeTo(to) }, location.pathname))
  const computedClassName =
    typeof className === "function" ? className({ isActive }) : className

  return (
    <Link to={to} className={computedClassName} {...props}>
      {children}
    </Link>
  )
}

export function useNavigate() {
  const router = useRouter()

  return useCallback(
    (to, options = {}) => {
      if (typeof to === "number") {
        if (to < 0) router.back()
        return
      }

      const href = normalizeTo(to)
      if (options.replace) {
        router.replace(href)
      } else {
        router.push(href)
      }
    },
    [router]
  )
}

export function useLocation() {
  const pathname = usePathname() || "/"

  return {
    pathname,
    search: "",
    hash: "",
    state: null,
    key: "next",
  }
}

export function useParams() {
  return useNextParams() || {}
}

export function Navigate({ to, replace = true }) {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(to, { replace })
  }, [navigate, to, replace])

  return null
}

export function BrowserRouter({ children }) {
  return children
}

export function Routes({ children }) {
  return children
}

export function Route({ element }) {
  return element || null
}

export function Outlet() {
  return null
}

export function matchPath(patternInput, pathname) {
  const pattern =
    typeof patternInput === "string" ? patternInput : patternInput?.path || "/"

  if (!pattern) return null

  const normalizedPathname = pathname?.replace(/\/+$/, "") || "/"
  const normalizedPattern = pattern.replace(/\/+$/, "") || "/"

  const paramNames = []
  const escaped = normalizedPattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/:(\w+)/g, (_, key) => {
      paramNames.push(key)
      return "([^/]+)"
    })

  const regex = new RegExp(`^${escaped}$`)
  const match = normalizedPathname.match(regex)
  if (!match) return null

  const params = {}
  paramNames.forEach((name, i) => {
    params[name] = match[i + 1]
  })

  return {
    params,
    pathname: normalizedPathname,
    pattern: { path: normalizedPattern },
  }
}
