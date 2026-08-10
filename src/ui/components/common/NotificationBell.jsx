"use client"

import { useEffect, useRef, useState } from "react"
import { useSelector } from "react-redux"
import { FiBell } from "react-icons/fi"
import { useNavigate } from "@/ui/lib/router"

import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/operations/notificationAPI"

export default function NotificationBell() {
  const { token } = useSelector((state) => state.auth)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const containerRef = useRef(null)

  const load = async () => {
    const result = await fetchMyNotifications(token)
    if (result) {
      setNotifications(result.notifications)
      setUnreadCount(result.unreadCount)
    }
  }

  useEffect(() => {
    if (!token) return
    load()
    // Poll every 60s — no websocket infra in this app, and a minute of
    // staleness on a notification bell is an acceptable trade for not
    // introducing one just for this.
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleOpen = () => {
    setOpen((prev) => !prev)
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markNotificationRead(token, notification._id)
      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    setOpen(false)
    if (notification.link) navigate(notification.link)
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(token)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  if (!token) return null

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative text-richblack-100 hover:text-yellow-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50 rounded-md p-1"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
      >
        <FiBell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-pink-600 px-1 text-[10px] font-bold text-paper">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border border-richblack-700 bg-richblack-800 shadow-lg">
          <div className="flex items-center justify-between border-b border-richblack-700 px-4 py-3">
            <p className="font-semibold text-richblack-5">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-yellow-50 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-richblack-400">No notifications yet.</p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification._id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`block w-full border-b border-richblack-700 px-4 py-3 text-left last:border-b-0 hover:bg-richblack-700 ${
                    notification.read ? "" : "bg-richblack-700/40"
                  }`}
                >
                  <p className="text-sm font-medium text-richblack-5">{notification.title}</p>
                  {notification.body && (
                    <p className="mt-1 line-clamp-2 text-xs text-richblack-300">{notification.body}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
