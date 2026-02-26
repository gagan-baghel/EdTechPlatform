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

  const matchRoute = (route) => {
    return matchPath({ path: route }, location.pathname)
  }

  return (
    <NavLink
      to={link.path}
      onClick={() => dispatch(resetCourseState())}
      className={`relative px-8 py-2 text-sm font-medium ${
        matchRoute(link.path)
          ? "bg-yellow-800 text-yellow-50"
          : "bg-opacity-0 text-richblack-300"
      } transition-all duration-200`}
    >
      <span
        className={`absolute left-0 top-0 h-full w-[0.15rem] bg-yellow-50 ${
          matchRoute(link.path) ? "opacity-100" : "opacity-0"
        }`}
      ></span>
      <div className="flex items-center gap-x-2">
        {/* Icon Goes Here */}
        <Icon className="text-lg" />
        <span>{link.name}</span>
      </div>
    </NavLink>
  )
}
