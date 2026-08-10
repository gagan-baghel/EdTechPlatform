import type { Response } from "express"
import { fail } from "../lib/respond"
import type { AuthedRequest } from "../lib/http"
import Notification from "../models/Notification"
import User from "../models/User"

export const listMyNotifications = async (req: AuthedRequest, res: Response) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
    const unreadCount = await Notification.countDocuments({ user: req.user.id, read: false })
    return res.status(200).json({ success: true, data: { notifications, unreadCount } })
  } catch (error) {
    return fail(res, error, "listMyNotifications", "Could not load notifications")
  }
}

export const markRead = async (req: AuthedRequest, res: Response) => {
  try {
    const { notificationId } = req.params
    await Notification.updateOne({ _id: notificationId, user: req.user.id }, { $set: { read: true } })
    return res.status(200).json({ success: true })
  } catch (error) {
    return fail(res, error, "markRead", "Could not update notification")
  }
}

export const markAllRead = async (req: AuthedRequest, res: Response) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { $set: { read: true } })
    return res.status(200).json({ success: true })
  } catch (error) {
    return fail(res, error, "markAllRead", "Could not update notifications")
  }
}

export const getEmailPreferences = async (req: AuthedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user.id).select("notificationEmailPreferences")
    const preferences = Object.fromEntries(user.notificationEmailPreferences || [])
    return res.status(200).json({ success: true, data: preferences })
  } catch (error) {
    return fail(res, error, "getEmailPreferences", "Could not load preferences")
  }
}

export const updateEmailPreferences = async (req: AuthedRequest, res: Response) => {
  try {
    const { preferences } = req.body
    if (!preferences || typeof preferences !== "object") {
      return res.status(400).json({ success: false, message: "preferences object is required" })
    }
    // Whitelist boolean values only — this becomes a Mongoose Map, so
    // anything else would either be silently coerced or throw a cast error.
    const sanitized: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(preferences)) {
      if (typeof value === "boolean") sanitized[key] = value
    }

    await User.findByIdAndUpdate(req.user.id, { notificationEmailPreferences: sanitized })
    return res.status(200).json({ success: true, message: "Preferences updated" })
  } catch (error) {
    return fail(res, error, "updateEmailPreferences", "Could not update preferences")
  }
}
