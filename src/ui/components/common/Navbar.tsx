"use client"
import type { ApiFailure } from "@/types/api"
import type { DataBody } from "../../types"

import React, { useState } from "react"
import { useTranslations } from "next-intl"
import { AiOutlineMenu, AiOutlineShoppingCart } from "react-icons/ai"
import { BsChevronDown } from "react-icons/bs"
import { FiSun, FiMoon } from "react-icons/fi"
import { useSelector } from "react-redux"
import { Link, useLocation, matchPath } from "@/ui/lib/router"

import Brand from "./Brand"
import { NavbarLinks } from "../../data/navbar-links"
import { apiConnector } from "../../services/apiconnector"
import { categories } from "../../services/apis"
import { ACCOUNT_TYPE } from "../../utils/constants"
import ProfileDropdown from "../core/Auth/ProfileDropDown"
import NotificationBell from "./NotificationBell"
import MobileNav from "./MobileNav"
import SearchBar from "./SearchBar"
import { SUPPORTED_LOCALES, useLocaleSwitcher } from "../../providers/LocaleProvider"
import { useTheme } from "../../providers/ThemeProvider"
import type { RootState } from "../../store"

/** A catalogue category as the mega-menu renders it. */
interface SubLink {
  _id: string
  name: string
}

export default function Navbar() {
  const { token } = useSelector((state: RootState) => state.auth)
  const { user } = useSelector((state: RootState) => state.profile)
  const { totalItems } = useSelector((state: RootState) => state.cart)
  const location = useLocation()

  const [subLinks, setSubLinks] = useState<SubLink[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [menuOpen, setMenuOpen] = useState<boolean>(false)

  const t = useTranslations("Navbar")
  const { locale, setLocale } = useLocaleSwitcher()
  const { theme, toggleTheme } = useTheme()

  const fetchSublinks = async () => {
    setLoading(true)
    try {
      const res = await apiConnector<DataBody<SubLink[]> | ApiFailure>(
        "GET",
        categories.CATEGORIES_API
      )
      setSubLinks(res.data.success ? res.data.data : [])
    } catch (error) {
      console.log("Could not fetch Categories.", error)
    }
    setLoading(false)
  }

  const primeCatalogMenu = () => {
    if (!subLinks.length && !loading) {
      fetchSublinks()
    }
  }

  const matchRoute = (route?: string) => {
    if (!route) return false
    return matchPath({ path: route }, location.pathname)
  }

  const linkClass = (active: boolean) =>
    `relative flex h-14 items-center gap-1 text-[13px] transition-colors ${
      active
        ? "text-richblack-5 after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-accent"
        : "text-richblack-300 hover:text-richblack-5"
    }`

  return (
    <div className="fixed top-0 z-50 flex h-14 w-full items-center border-b border-richblack-700 bg-richblack-900/95 backdrop-blur-sm print:hidden">
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-10">
        <Link to="/" aria-label="IntelleCraft home" className="shrink-0">
          <Brand />
        </Link>

        <nav className="hidden md:block" aria-label="Primary">
          <ul className="flex items-center gap-x-7">
            {NavbarLinks.map((link, index) => (
              <li key={index}>
                {link.title === "Catalog" ? (
                  <div
                    onMouseEnter={primeCatalogMenu}
                    onFocus={primeCatalogMenu}
                    className={`group cursor-pointer ${linkClass(Boolean(matchRoute("/catalog/:catalogName")))}`}
                  >
                    <span>{link.title}</span>
                    <BsChevronDown className="text-[10px] transition-transform group-hover:rotate-180" />
                    <div className="invisible absolute left-1/2 top-full z-[1000] w-[280px] -translate-x-1/2 translate-y-2 border border-richblack-600 bg-richblack-900 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                      <p className="stamp border-b border-richblack-700 px-4 py-3 text-richblack-400">Categories</p>
                      {loading ? (
                        <p className="px-4 py-4 text-sm text-richblack-300">Loading</p>
                      ) : subLinks.length ? (
                        <ul className="max-h-[60vh] overflow-y-auto py-1">
                          {subLinks
                            .filter((subLink) => subLink?.name !== null)
                            .map((subLink, i) => (
                              <li key={i}>
                                <Link
                                  to={`/catalog/${subLink.name.split(" ").join("-").toLowerCase()}`}
                                  className="block px-4 py-2.5 text-sm text-richblack-100 hover:bg-richblack-800 hover:text-richblack-5"
                                >
                                  {subLink.name}
                                </Link>
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className="px-4 py-4 text-sm text-richblack-300">No categories yet</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <Link to={link?.path || "/"} className={linkClass(Boolean(matchRoute(link?.path)))}>
                    {link.titleKey ? t(link.titleKey) : link.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-x-3 md:flex">
          <SearchBar className="w-40 lg:w-56" />
          {user && user?.accountType !== ACCOUNT_TYPE.INSTRUCTOR && (
            <Link to="/dashboard/cart" className="relative p-1.5 text-richblack-200 hover:text-richblack-5" aria-label="Cart">
              <AiOutlineShoppingCart className="text-xl" />
              {totalItems > 0 && (
                <span className="figure absolute -right-1 -top-0.5 grid h-4 min-w-4 place-items-center bg-yellow-50 px-1 text-[10px] text-on-signal">
                  {totalItems}
                </span>
              )}
            </Link>
          )}
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            aria-label="Select language"
            className="stamp border border-richblack-600 bg-transparent px-2 py-1.5 text-richblack-200"
          >
            {SUPPORTED_LOCALES.map((l) => (
              <option key={l.code} value={l.code} className="text-ink">
                {l.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="p-1.5 text-richblack-200 transition-colors hover:text-richblack-5"
          >
            {theme === "dark" ? <FiSun size={16} /> : <FiMoon size={16} />}
          </button>
          {token === null && (
            <Link to="/login" className="px-2 text-[13px] text-richblack-200 hover:text-richblack-5">
              {t("login")}
            </Link>
          )}
          {token === null && (
            <Link to="/signup" className="stamp bg-yellow-50 px-4 py-2 text-on-signal transition-[filter] hover:brightness-110">
              {t("signup")}
            </Link>
          )}
          {token !== null && <NotificationBell />}
          {token !== null && <ProfileDropdown />}
        </div>

        <button
          type="button"
          className="relative p-2 text-richblack-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden"
          onClick={() => {
            primeCatalogMenu()
            setMenuOpen(true)
          }}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
        >
          <AiOutlineMenu fontSize={22} />
          {totalItems > 0 && token && user?.accountType !== ACCOUNT_TYPE.INSTRUCTOR && (
            <span
              className="figure absolute right-0 top-0 grid h-4 min-w-4 place-items-center bg-yellow-50 px-1 text-[10px] text-on-signal"
              aria-hidden="true"
            >
              {totalItems}
            </span>
          )}
        </button>
      </div>

      <MobileNav
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        subLinks={subLinks}
        categoriesLoading={loading}
      />
    </div>
  )
}
