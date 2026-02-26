"use client"

import { useCallback, useEffect } from "react"
import NextLink from "next/link"
import { usePathname, useRouter, useParams as useNextParams } from "next/navigation"

function normalizeTo(to) {
  if (typeof to === "string") return to
  if (to && typeof to === "object") {
    if (typeof to.pathname === "string") {
      const search = to.search || ""
      const hash = to.hash || ""
      return `${to.pathname}${search}${hash}`
    }
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
