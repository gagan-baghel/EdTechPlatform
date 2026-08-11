"use client"

import React, { useEffect, useRef, useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { Link, useNavigate } from "@/ui/lib/router"
import { AiOutlineClose, AiOutlineShoppingCart } from "react-icons/ai"
import { BsChevronDown } from "react-icons/bs"
import { VscDashboard, VscSignOut } from "react-icons/vsc"
import Image from "next/image"

import { NavbarLinks } from "../../data/navbar-links"
import { ACCOUNT_TYPE } from "../../utils/constants"
import { normalizeAvatarUrl } from "../../utils/avatar"
import { logout } from "../../services/operations/authAPI"
import SearchBar from "./SearchBar"
import type { RootState } from "../../store"
import type { AppDispatch } from "../../store"

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

interface SubLink {
  _id?: string
  name: string
}

interface MobileNavProps {
  open: boolean
  onClose: () => void
  subLinks: SubLink[]
  categoriesLoading: boolean
}

export default function MobileNav({ open, onClose, subLinks, categoriesLoading }: MobileNavProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const [catalogOpen, setCatalogOpen] = useState(false)
  const { token } = useSelector((state: RootState) => state.auth)
  const { user } = useSelector((state: RootState) => state.profile)
  const { totalItems } = useSelector((state: RootState) => state.cart)

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement
    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"

    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    firstFocusable?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
        return
      }

      if (event.key !== "Tab") return

      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!nodes?.length) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = overflow
      if (previouslyFocused) previouslyFocused.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const profileImage = user
    ? normalizeAvatarUrl(user?.userImage, user?.firstName, user?.lastName)
    : ""

  const handleLogout = () => {
    dispatch(logout(navigate))
    onClose()
  }

  const linkClass =
    "block rounded-lg px-4 py-3 text-base text-richblack-25 transition hover:bg-richblack-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50"

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        className="absolute right-0 top-0 flex h-full w-[85%] max-w-sm flex-col overflow-y-auto border-l border-richblack-700 bg-richblack-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-richblack-700 px-5 py-4">
          <span className="text-lg font-semibold text-richblack-5">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-full p-2 text-richblack-100 transition hover:bg-richblack-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50"
          >
            <AiOutlineClose fontSize={20} />
          </button>
        </div>

        {user && (
          <div className="flex items-center gap-3 border-b border-richblack-700 px-5 py-4">
            <Image
              src={profileImage}
              alt=""
              width={40}
              height={40}
              className="aspect-square rounded-full object-cover"
              sizes="40px"
              unoptimized={profileImage?.includes("api.dicebear.com")}
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-richblack-5">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-sm text-richblack-300">{user.email}</p>
            </div>
          </div>
        )}

        <div className="px-4 pt-4">
          <SearchBar onSubmitted={onClose} />
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="flex flex-col gap-1">
            {NavbarLinks.map((link) => (
              <li key={link.title}>
                {link.title === "Catalog" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCatalogOpen((v) => !v)}
                      aria-expanded={catalogOpen}
                      className={`flex w-full items-center justify-between ${linkClass}`}
                    >
                      <span>Catalog</span>
                      <BsChevronDown
                        className={`transition-transform ${catalogOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {catalogOpen && (
                      <ul className="ml-3 mt-1 flex flex-col gap-1 border-l border-richblack-700 pl-3">
                        {categoriesLoading ? (
                          <li className="px-4 py-3 text-sm text-richblack-300">
                            Loading categories...
                          </li>
                        ) : subLinks?.length ? (
                          subLinks
                            .filter((s) => s?.name)
                            .map((subLink) => (
                              <li key={subLink._id ?? subLink.name}>
                                <Link
                                  to={`/catalog/${subLink.name.split(" ").join("-").toLowerCase()}`}
                                  onClick={onClose}
                                  className={`${linkClass} text-sm`}
                                >
                                  {subLink.name}
                                </Link>
                              </li>
                            ))
                        ) : (
                          <li className="px-4 py-3 text-sm text-richblack-300">
                            No categories yet
                          </li>
                        )}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link to={link.path || "/"} onClick={onClose} className={linkClass}>
                    {link.title}
                  </Link>
                )}
              </li>
            ))}

            {token && user?.accountType !== ACCOUNT_TYPE.INSTRUCTOR && (
              <li>
                <Link to="/dashboard/cart" onClick={onClose} className={`flex items-center justify-between ${linkClass}`}>
                  <span className="flex items-center gap-3">
                    <AiOutlineShoppingCart fontSize={20} />
                    Cart
                  </span>
                  {totalItems > 0 && (
                    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-yellow-50 px-2 text-xs font-bold text-ink">
                      {totalItems}
                    </span>
                  )}
                </Link>
              </li>
            )}

            {token && (
              <li>
                <Link to="/dashboard/my-profile" onClick={onClose} className={`flex items-center gap-3 ${linkClass}`}>
                  <VscDashboard fontSize={20} />
                  Dashboard
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="border-t border-richblack-700 px-5 py-5">
          {token ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-richblack-600 bg-richblack-800 px-4 py-3 font-semibold text-richblack-5 transition hover:bg-richblack-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50"
            >
              <VscSignOut fontSize={18} />
              Log out
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <Link
                to="/login"
                onClick={onClose}
                className="rounded-lg border border-richblack-600 bg-richblack-800 px-4 py-3 text-center font-semibold text-richblack-5 transition hover:bg-richblack-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                onClick={onClose}
                className="rounded-lg bg-yellow-50 px-4 py-3 text-center font-semibold text-ink transition hover:bg-yellow-25 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
