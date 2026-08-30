"use client"
import type { ApiFailure } from "@/types/api"
import type { DataBody } from "../../types"

import React, { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { AiOutlineMenu, AiOutlineShoppingCart } from "react-icons/ai"
import { BsChevronDown } from "react-icons/bs"
import { FiSun, FiMoon } from "react-icons/fi"
import { useSelector } from "react-redux"
import { Link, useLocation, matchPath } from "@/ui/lib/router"
import Image from "next/image"

import logo from "../../../../public/logo.png"
import darkLogo from "../../../../public/logo.png"
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
  const [scrolled, setScrolled] = useState<boolean>(false)

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const matchRoute = (route?: string) => {
    if (!route) return false
    return matchPath({ path: route }, location.pathname)
  }

  const isHomePage = location.pathname === "/"

  return (
    <div
      className={`fixed top-0 z-50 flex h-14 w-full items-center justify-center transition-all duration-300 ${
        isHomePage
          ? scrolled
            ? "border-b border-richblack-700 bg-richblack-900 shadow-sm"
            : "bg-transparent"
          : "border-b border-richblack-700 bg-richblack-900"
      }`}
    >
      <div className="flex w-11/12 max-w-maxContent items-center justify-between">
        {/* Logo */}
        <Link to="/">
          <Image
            src={theme === "dark" ? logo : (isHomePage && !scrolled ? logo : darkLogo)}
            alt="Logo"
            width={160}
            height={32}
            className="h-8 object-contain"
          />
        </Link>
        {/* Navigation links */}
        <nav className="hidden md:block">
          <ul
            className={`flex gap-x-6 text-sm ${
              isHomePage
                ? scrolled
                  ? "text-richblack-25"
                  : "text-white"
                : "text-richblack-25"
            }`}
          >
            {NavbarLinks.map((link, index) => (
              <li key={index}>
                {link.title === "Catalog" ? (
                  <>
                    <div
                      onMouseEnter={primeCatalogMenu}
                      onFocus={primeCatalogMenu}
                      className={`group relative flex cursor-pointer items-center gap-1 ${
                        matchRoute("/catalog/:catalogName")
                          ? "nav-active"
                          : isHomePage
                            ? scrolled
                              ? "text-richblack-25"
                              : "text-white"
                            : "text-richblack-25"
                      }`}
                    >
                      <p>{link.title}</p>
                      <BsChevronDown />
                      <div className="invisible absolute left-[50%] top-[50%] z-[1000] flex w-[200px] translate-x-[-50%] translate-y-[3em] flex-col rounded-lg bg-richblack-5 p-4 text-ink opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-[1.65em] group-hover:opacity-100 lg:w-[300px]">
                        <div className="absolute left-[50%] top-0 -z-10 h-6 w-6 translate-x-[80%] translate-y-[-40%] rotate-45 select-none rounded bg-richblack-5"></div>
                        {loading ? (
                          <p className="text-center">Loading...</p>
                        ) : subLinks.length ? (
                          <>
                            {subLinks
                              ?.filter(
                                (subLink) => subLink?.name !== null
                              )
                              ?.map((subLink, i) => (
                                <Link
                                  to={`/catalog/${subLink.name
                                    .split(" ")
                                    .join("-")
                                    .toLowerCase()}`}
                                  className="rounded-lg bg-transparent py-4 pl-4 hover:bg-richblack-50"
                                  key={i}
                                >
                                  <p>{subLink.name}</p>
                                </Link>
                              ))}
                          </>
                        ) : (
                          <p className="text-center">No Courses Found</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <Link to={link?.path || "/"}>
                    <p
                      className={`${
                        matchRoute(link?.path)
                          ? "nav-active"
                          : isHomePage
                            ? scrolled
                              ? "text-richblack-25"
                              : "text-white"
                            : "text-richblack-25"
                      }`}
                    >
                      {link.titleKey ? t(link.titleKey) : link.title}
                    </p>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        {/* Login / Signup / Dashboard */}
        <div className="hidden items-center gap-x-4 md:flex">
          <SearchBar className="w-40 lg:w-56" />
          {user && user?.accountType !== ACCOUNT_TYPE.INSTRUCTOR && (
            <Link to="/dashboard/cart" className="relative">
              <AiOutlineShoppingCart
                className={`text-2xl ${
                  isHomePage
                    ? scrolled
                      ? "text-richblack-25"
                      : "text-white"
                    : "text-richblack-100"
                }`}
              />
              {totalItems > 0 && (
                <span className="absolute -bottom-2 -right-2 grid h-5 w-5 place-items-center overflow-hidden rounded-full bg-richblack-600 text-center text-xs font-bold text-yellow-100">
                  {totalItems}
                </span>
              )}
            </Link>
          )}
          {token === null && (
            <Link to="/login">
              <button
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  isHomePage
                    ? scrolled
                      ? "border border-richblack-600 bg-richblack-800 text-richblack-5 hover:bg-richblack-700"
                      : "border border-white/15 bg-[#161D29]/70 text-white hover:bg-[#161D29]/90"
                    : "rounded-[8px] border border-richblack-700 bg-richblack-800 px-[12px] py-[8px] text-richblack-100"
                }`}
              >
                {t("login")}
              </button>
            </Link>
          )}
          {token === null && (
            <Link to="/signup">
              <button
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  isHomePage
                    ? scrolled
                      ? "bg-yellow-50 text-ink hover:bg-yellow-25"
                      : "bg-yellow-50 text-ink hover:bg-yellow-25"
                    : "rounded-[8px] border border-richblack-700 bg-richblack-800 px-[12px] py-[8px] text-richblack-100"
                }`}
              >
                {t("signup")}
              </button>
            </Link>
          )}
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            aria-label="Select language"
            className={`rounded-md border bg-transparent px-2 py-1 text-xs ${
              isHomePage && !scrolled ? "border-white/20 text-white" : "border-richblack-600 text-richblack-100"
            }`}
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
            className={`rounded-md p-1.5 transition-colors ${
              isHomePage && !scrolled ? "text-white hover:bg-white/10" : "text-richblack-100 hover:bg-richblack-700"
            }`}
          >
            {theme === "dark" ? <FiSun size={16} /> : <FiMoon size={16} />}
          </button>
          {token !== null && <NotificationBell />}
          {token !== null && <ProfileDropdown />}

        </div>
        <button
          type="button"
          className="relative mr-2 rounded-lg p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50 md:hidden"
          onClick={() => {
            primeCatalogMenu()
            setMenuOpen(true)
          }}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
        >
          <AiOutlineMenu
            fontSize={24}
            fill={
              isHomePage
                ? scrolled
                  ? "#F1F2FF"
                  : "#FFFFFF"
                : "#AFB2BF"
            }
          />
          {totalItems > 0 && token && user?.accountType !== ACCOUNT_TYPE.INSTRUCTOR && (
            <span
              className="absolute right-0 top-0 grid h-4 w-4 place-items-center rounded-full bg-yellow-50 text-[10px] font-bold text-ink"
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
