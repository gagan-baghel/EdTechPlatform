import {
  VscAccount,
  VscAdd,
  VscDashboard,
  VscHistory,
  VscMortarBoard,
  VscSettingsGear,
  VscVm,
} from "react-icons/vsc"
import { useDispatch } from "react-redux"
import { NavLink, matchPath, useLocation } from "@/ui/lib/router"

import { resetCourseState } from "../../../slices/courseSlice"

const iconMap = {
  VscAccount,
  VscDashboard,
  VscVm,
  VscAdd,
  VscMortarBoard,
  VscHistory,
  VscSettingsGear,
}

export default function SidebarLink({ link, iconName }) {
  const Icon = iconMap[iconName] || VscAccount
  const location = useLocation()
  const dispatch = useDispatch()

  const isActive = Boolean(matchPath({ path: link.path }, location.pathname))

  return (
    <NavLink
      to={link.path}
      onClick={() => dispatch(resetCourseState())}
      aria-current={isActive ? "page" : undefined}
      className={`relative shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium md:px-8 md:py-2 ${
        isActive ? "bg-yellow-800 text-yellow-50" : "bg-opacity-0 text-richblack-300"
      } transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-50`}
    >
      {/* Active marker sits underneath on mobile, at the left edge on desktop */}
      <span
        className={`absolute bottom-0 left-0 h-[0.15rem] w-full bg-yellow-50 md:top-0 md:h-full md:w-[0.15rem] ${
          isActive ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />
      <div className="flex items-center gap-x-2">
        <Icon className="text-lg" />
        <span>{link.name}</span>
      </div>
    </NavLink>
  )
}
