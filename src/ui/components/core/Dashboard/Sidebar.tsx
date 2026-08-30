"use client"
import type { ModalData } from "@/ui/components/common/ConfirmationModal"

import { useEffect, useRef, useState } from "react"
import { VscSignOut } from "react-icons/vsc"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "@/ui/lib/router"

import SidebarLink from "./SidebarLink"
import { logout } from "../../../services/operations/authAPI"
import ConfirmationModal from "../../common/ConfirmationModal"
import Spinner from "../../common/Spinner"
import { sidebarLinks } from "../../../data/dashboard-links"
import type { RootState, AppDispatch } from "../../../store"

/** A dashboard sidebar entry from `data/dashboard-links`. */
interface DashboardLink {
  id: number
  name: string
  path: string
  type?: string
  icon: string
}

export default function Sidebar() {
  const { user, loading: profileLoading } = useSelector((state: RootState) => state.profile)
  const { loading: authLoading } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const [confirmationModal, setConfirmationModal] = useState<ModalData | null>(null)
  const navRef = useRef<HTMLElement | null>(null)

  /**
   * Below md the sidebar collapses into a horizontal tab strip that is far
   * wider than a phone (1142px against a 375px viewport), so the current page
   * can easily be off-screen when you arrive. Scroll it into view.
   *
   * `block: "nearest"` so it never scrolls the PAGE vertically — only the
   * strip horizontally.
   */
  useEffect(() => {
    const active = navRef.current?.querySelector("[aria-current='page']")
    active?.scrollIntoView({ inline: "center", block: "nearest" })
  }, [])

  if (profileLoading || authLoading) {
    return (
      <div className="grid w-full items-center border-b border-richblack-700 bg-richblack-800 py-6 md:h-[calc(100vh-3.5rem)] md:w-auto md:min-w-[220px] md:border-b-0 md:border-r">
        <Spinner />
      </div>
    )
  }

  const visibleLinks = sidebarLinks.filter(
    (link: DashboardLink) => !link.type || user?.accountType === link.type
  )

  return (
    <>
      {/* Below md this becomes a horizontally scrollable tab strip so the
          content column keeps the full viewport width. */}
      <nav
        ref={navRef}
        aria-label="Dashboard"
        // `dashboard-tabstrip` adds the edge fade below md — without an
        // affordance there is nothing on screen to suggest the strip scrolls,
        // so six of the eight destinations were effectively hidden.
        // `sticky top-14` keeps it reachable instead of scrolling away with
        // the content on a long page.
        className="dashboard-tabstrip sticky top-14 z-30 flex w-full shrink-0 flex-row overflow-x-auto border-b border-richblack-700 bg-richblack-800 md:static md:h-[calc(100vh-3.5rem)] md:w-auto md:min-w-[220px] md:flex-col md:overflow-x-visible md:overflow-y-auto md:border-b-0 md:border-r md:py-10"
      >
        <div className="flex flex-row md:flex-col">
          {visibleLinks.map((link) => (
            <SidebarLink key={link.id} link={link} iconName={link.icon} />
          ))}
        </div>

        <div className="mx-auto my-6 hidden h-[1px] w-10/12 bg-richblack-700 md:block" />

        <div className="flex flex-row md:flex-col">
          <SidebarLink
            link={{ name: "Settings", path: "/dashboard/settings" }}
            iconName="VscSettingsGear"
          />
          <button
            type="button"
            onClick={() =>
              setConfirmationModal({
                text1: "Log out?",
                text2: "You will need to sign in again to access your courses.",
                btn1Text: "Log out",
                btn2Text: "Cancel",
                btn1Handler: () => dispatch(logout(navigate)),
                btn2Handler: () => setConfirmationModal(null),
              })
            }
            className="shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium text-richblack-300 transition hover:text-richblack-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-50 md:px-8 md:py-2"
          >
            <div className="flex items-center gap-x-2">
              <VscSignOut className="text-lg" />
              <span>Logout</span>
            </div>
          </button>
        </div>
      </nav>
      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </>
  )
}
