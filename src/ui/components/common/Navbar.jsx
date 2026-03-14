import { useEffect, useState } from "react"
import Image from "next/image"
import { AiOutlineMenu, AiOutlineShoppingCart } from "react-icons/ai"
import { BsChevronDown } from "react-icons/bs"
import { useSelector } from "react-redux"
import { Link, matchPath, useLocation } from "@/ui/lib/router"

import { NavbarLinks } from "../../data/navbar-links"
import { fetchCategoriesCached } from "../../services/sharedData"
import { ACCOUNT_TYPE } from "../../utils/constants"
import ProfileDropdown from "../core/Auth/ProfileDropDown"

function Navbar() {
  const { token } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)
  const { totalItems } = useSelector((state) => state.cart)
  const location = useLocation()
  const isHomePage = location.pathname === "/"

  const [subLinks, setSubLinks] = useState([])
  const [loading, setLoading] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [catalogTouched, setCatalogTouched] = useState(false)

  useEffect(() => {
    if (!catalogTouched || subLinks.length) return

    ;(async () => {
      setLoading(true)
      try {
        const data = await fetchCategoriesCached()
        setSubLinks(data)
      } catch (_error) {
        setSubLinks([])
      } finally {
        setLoading(false)
      }
    })()
  }, [catalogTouched, subLinks.length])

  useEffect(() => {
    if (!isHomePage) {
      setScrolled(false)
      return
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 24)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll)

    return () => window.removeEventListener("scroll", handleScroll)
  }, [isHomePage])


  const matchRoute = (route) => {
    return matchPath({ path: route }, location.pathname)
  }

  const primeCatalogMenu = () => {
    if (!catalogTouched) {
      setCatalogTouched(true)
    }
  }

  return (
    <div
      className={`z-40 flex items-center justify-center transition-all duration-300 ${
        isHomePage
          ? `fixed left-0 right-0 top-0 border-b ${
              scrolled
                ? "border-richblack-700/80 bg-richblack-900/88 py-[1.1rem] shadow-[0_16px_50px_rgba(0,8,20,0.45)] backdrop-blur-2xl"
                : "border-transparent bg-transparent py-[1.65rem]"
            }`
          : "h-[3.85rem] border-b-[1px] border-b-richblack-700 bg-richblack-800"
      }`}
    >
      <div
        className={`flex items-center justify-between ${
          isHomePage ? "w-11/12 max-w-[1280px]" : "w-11/12 max-w-maxContent"
        }`}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="rounded-full bg-white/5 p-2 ring-1 ring-white/10">
            <Image
              src="/logo.png"
              alt="IntelleCraft logo"
              width={40}
              height={40}
              className="h-10 w-10 object-contain invert"
              priority={isHomePage}
              sizes="40px"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-semibold tracking-tight text-white">IntelleCraft</span>
            <span className="hidden text-xs uppercase tracking-[0.24em] text-white/55 lg:block">
              Education OS
            </span>
          </div>
        </Link>
        {/* Navigation links */}
        <nav className="hidden md:block">
          <ul
            className={`flex gap-x-6 ${
              isHomePage
                ? scrolled
                  ? "text-richblack-100"
                  : "text-richblack-25"
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
                          ? "text-yellow-25"
                          : isHomePage
                            ? scrolled
                              ? "text-richblack-25"
                              : "text-richblack-25"
                            : "text-richblack-25"
                      }`}
                    >
                      <p>{link.title}</p>
                      <BsChevronDown />
                      <div className="invisible absolute left-[50%] top-[50%] z-[1000] flex w-[200px] translate-x-[-50%] translate-y-[3em] flex-col rounded-lg bg-richblack-5 p-4 text-richblack-900 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-[1.65em] group-hover:opacity-100 lg:w-[300px]">
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
                  <Link to={link?.path}>
                    <p
                      className={`${
                        matchRoute(link?.path)
                          ? "text-yellow-25"
                          : isHomePage
                            ? scrolled
                              ? "text-richblack-25"
                              : "text-richblack-25"
                            : "text-richblack-25"
                      }`}
                    >
                      {link.title}
                    </p>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        {/* Login / Signup / Dashboard */}
        <div className="hidden items-center gap-x-4 md:flex">
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
                      : "border border-white/15 bg-richblack-800/70 text-white hover:bg-richblack-700/80"
                    : "rounded-[8px] border border-richblack-700 bg-richblack-800 px-[12px] py-[8px] text-richblack-100"
                }`}
              >
                Log in
              </button>
            </Link>
          )}
          {token === null && (
            <Link to="/signup">
              <button
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  isHomePage
                    ? scrolled
                      ? "bg-yellow-50 text-richblack-900 hover:bg-yellow-25"
                      : "bg-yellow-50 text-richblack-900 hover:bg-yellow-25"
                    : "rounded-[8px] border border-richblack-700 bg-richblack-800 px-[12px] py-[8px] text-richblack-100"
                }`}
              >
                Sign up
              </button>
            </Link>
          )}
          {token !== null && <ProfileDropdown />} 

        </div>
        <button className="mr-4 md:hidden">
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
        </button>
      </div>
    </div>
  )
}

export default Navbar
