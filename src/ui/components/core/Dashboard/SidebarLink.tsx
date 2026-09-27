import {
  VscAccount,
  VscAdd,
  VscChecklist,
  VscCreditCard,
  VscDashboard,
  VscGift,
  VscGraph,
  VscHistory,
  VscMortarBoard,
  VscOrganization,
  VscSettingsGear,
  VscShield,
  VscVm,
} from "react-icons/vsc"
import { useDispatch } from "react-redux"
import { NavLink, matchPath, useLocation } from "@/ui/lib/router"

import { resetCourseState } from "../../../slices/courseSlice"
import type { AppDispatch } from "../../../store"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  VscAccount,
  VscDashboard,
  VscVm,
  VscAdd,
  VscGraph,
  VscMortarBoard,
  VscHistory,
  VscSettingsGear,
  VscShield,
  VscCreditCard,
  VscOrganization,
  VscGift,
  VscChecklist,
}

interface SidebarLinkProps {
  link: {
    path: string;
    name: string;
  };
  iconName: string;
}

export default function SidebarLink({ link, iconName }: SidebarLinkProps) {
  const Icon = iconMap[iconName] || VscAccount
  const location = useLocation()
  const dispatch = useDispatch<AppDispatch>()

  const isActive = Boolean(matchPath({ path: link.path }, location.pathname))

  return (
    <NavLink
      to={link.path}
      onClick={() => {
        // Previously fired on EVERY sidebar click, so navigating to "My
        // Courses" to check something mid-wizard silently discarded the
        // instructor's step/course progress. "Add Course" unambiguously
        // means "start a new course," so only that link resets — editing
        // an existing draft goes through My Courses → Edit instead, which
        // loads that course into the slice itself.
        if (link.path === "/dashboard/add-course") {
          dispatch(resetCourseState())
        }
      }}
      aria-current={isActive ? "page" : undefined}
      className={`relative shrink-0 whitespace-nowrap px-5 py-3 text-[13px] md:px-6 md:py-2.5 ${
        isActive ? "bg-richblack-800 text-richblack-5" : "text-richblack-300 hover:bg-richblack-800 hover:text-richblack-5"
      } transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent`}
    >
      {/* Active marker sits underneath on mobile, at the left edge on desktop */}
      <span
        className={`absolute bottom-0 left-0 h-[2px] w-full bg-accent md:top-0 md:h-full md:w-[2px] ${
          isActive ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />
      <div className="flex items-center gap-x-3">
        <Icon className="text-base" />
        <span>{link.name}</span>
      </div>
    </NavLink>
  )
}
