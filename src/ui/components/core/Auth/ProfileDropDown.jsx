"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AiOutlineCaretDown } from "react-icons/ai"
import { VscDashboard, VscSignOut } from "react-icons/vsc"
import { useDispatch, useSelector } from "react-redux"
import { Link, useNavigate } from "@/ui/lib/router"

import useOnClickOutside from "../../../hooks/useOnClickOutside"
import { logout } from "../../../services/operations/authAPI"
import { normalizeAvatarUrl } from "../../../utils/avatar"

export default function ProfileDropdown() {
  const { user } = useSelector((state) => state.profile)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  // The wrapper is the outside-click boundary. Previously the ref sat on the
  // menu itself, so clicking the trigger again could never close it.
  const wrapperRef = useRef(null)
  const triggerRef = useRef(null)

  useOnClickOutside(wrapperRef, () => setOpen(false))

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open])

  if (!user) return null

  const profileImage = normalizeAvatarUrl(
    user?.userImage || user?.image,
    user?.firstName,
    user?.lastName
  )

  const itemClass =
    "flex w-full items-center gap-x-2 py-[10px] px-[12px] text-sm text-richblack-100 transition hover:bg-richblack-700 hover:text-richblack-25 focus:outline-none focus-visible:bg-richblack-700 focus-visible:text-richblack-25"

  return (
    // A <div> wrapper, not a <button> — the menu contains links and buttons,
    // and nesting interactive elements inside a button is invalid HTML.
    <div className="relative" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="flex items-center gap-x-1 rounded-full p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50"
      >
        <Image
          src={profileImage}
          alt=""
          width={30}
          height={30}
          className="aspect-square w-[30px] rounded-full object-cover"
          sizes="30px"
          unoptimized={profileImage.includes("api.dicebear.com")}
        />
        <AiOutlineCaretDown
          className={`text-sm text-richblack-100 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[118%] z-[1000] min-w-[180px] divide-y-[1px] divide-richblack-700 overflow-hidden rounded-md border-[1px] border-richblack-700 bg-richblack-800 shadow-lg"
        >
          <Link
            to="/dashboard/my-profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <VscDashboard className="text-lg" aria-hidden="true" />
            Dashboard
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              dispatch(logout(navigate))
              setOpen(false)
            }}
            className={itemClass}
          >
            <VscSignOut className="text-lg" aria-hidden="true" />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
