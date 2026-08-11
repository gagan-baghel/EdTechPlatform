"use client"

import { useCallback, useEffect, type ReactNode } from "react"
import NextLink from "next/link"
import {
  usePathname,
  useRouter,
  useParams as useNextParams,
  useSearchParams as useNextSearchParams,
} from "next/navigation"

/**
 * A react-router-shaped shim over next/navigation, so the components carried
 * over from the original router keep working without a rewrite.
 */

export interface LocationDescriptor {
  pathname?: string
  search?: string | Record<string, unknown>
  query?: Record<string, unknown>
  hash?: string
}

export type To = string | URL | LocationDescriptor

export interface NavigateOptions {
  replace?: boolean
}

/** `navigate("/path")`, `navigate(to, { replace })`, or `navigate(-1)` to go back. */
export type NavigateFunction = (to: To | number, options?: NavigateOptions) => void

function normalizeSearch(value: LocationDescriptor["search"]): string {
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

function normalizeHash(value: unknown): string {
  if (!value) return ""
  if (typeof value !== "string") return ""
  return value.startsWith("#") ? value : `#${value}`
}

function normalizeTo(to: To | undefined): string {
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

type LinkProps = Omit<React.ComponentProps<typeof NextLink>, "href"> & {
  to?: To
  href?: string
  children?: ReactNode
}

export function Link({ to, href, children, ...props }: LinkProps) {
  const nextHref = href ?? normalizeTo(to)
  return (
    <NextLink href={nextHref} {...props}>
      {children}
    </NextLink>
  )
}

type NavLinkProps = Omit<LinkProps, "className"> & {
  className?: string | ((state: { isActive: boolean }) => string)
}

export function NavLink({ to, className, children, ...props }: NavLinkProps) {
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

export function useNavigate(): NavigateFunction {
  const router = useRouter()

  return useCallback<NavigateFunction>(
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

export function useSearchParams() {
  return useNextSearchParams()
}

export interface Location {
  pathname: string
  search: string
  hash: string
  state: null
  key: string
}

/**
 * NOTE: `search` is intentionally always "".
 * Reading useSearchParams() here would force every consumer of useLocation()
 * — including Navbar, which renders on every route — into a Suspense boundary
 * and opt the whole app out of static rendering.
 * For query parameters use the `useSearchParams` export above, inside a
 * component wrapped in its own <Suspense> boundary.
 */
export function useLocation(): Location {
  const pathname = usePathname() || "/"

  return {
    pathname,
    search: "",
    hash: "",
    state: null,
    key: "next",
  }
}

export function useParams<
  T extends Record<string, string | string[]> = Record<string, string>,
>(): Partial<T> {
  return (useNextParams() ?? {}) as Partial<T>
}

export function Navigate({ to, replace = true }: { to: To; replace?: boolean }) {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(to, { replace })
  }, [navigate, to, replace])

  return null
}

export function BrowserRouter({ children }: { children: ReactNode }) {
  return children
}

export function Routes({ children }: { children: ReactNode }) {
  return children
}

export function Route({ element }: { element?: ReactNode }) {
  return element || null
}

export function Outlet() {
  return null
}

export interface PathMatch {
  params: Record<string, string>
  pathname: string
  pattern: { path: string }
}

export function matchPath(
  patternInput: string | { path?: string } | undefined,
  pathname: string | undefined
): PathMatch | null {
  const pattern =
    typeof patternInput === "string" ? patternInput : patternInput?.path || "/"

  if (!pattern) return null

  const normalizedPathname = pathname?.replace(/\/+$/, "") || "/"
  const normalizedPattern = pattern.replace(/\/+$/, "") || "/"

  const paramNames: string[] = []
  const escaped = normalizedPattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/:(\w+)/g, (_, key: string) => {
      paramNames.push(key)
      return "([^/]+)"
    })

  const regex = new RegExp(`^${escaped}$`)
  const match = normalizedPathname.match(regex)
  if (!match) return null

  const params: Record<string, string> = {}
  paramNames.forEach((name, i) => {
    params[name] = match[i + 1] ?? ""
  })

  return {
    params,
    pathname: normalizedPathname,
    pattern: { path: normalizedPattern },
  }
}
