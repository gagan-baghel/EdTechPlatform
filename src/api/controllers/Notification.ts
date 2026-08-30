import { z } from "zod"
import type { Response } from "express"
import { fail, parseOrThrow } from "../lib/respond"
import { objectId } from "../lib/schemas"
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
    const { notificationId } = parseOrThrow(
      z.object({ notificationId: objectId("A valid notification id is required") }),
      req.params
    )
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
    // `user` can legitimately be null — a deleted account whose token is still
    // inside its 24h window. Reading `.notificationEmailPreferences` off it was
    // a guaranteed 500 rather than a 404.
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }
    const preferences = Object.fromEntries(user.notificationEmailPreferences ?? [])
    return res.status(200).json({ success: true, data: preferences })
  } catch (error) {
    return fail(res, error, "getEmailPreferences", "Could not load preferences")
  }
}

export const updateEmailPreferences = async (req: AuthedRequest, res: Response) => {
  try {
    // Booleans only — this becomes a Mongoose Map, so anything else is either
    // silently coerced or a cast error. The key cap stops a caller from
    // growing the document without bound one preference at a time.
    const { preferences } = parseOrThrow(
      z.object({
        preferences: z
          .record(z.string().max(64), z.boolean())
          .refine((value) => Object.keys(value).length <= 50, {
            message: "Too many preference keys",
          }),
      }),
      req.body
    )

    await User.findByIdAndUpdate(req.user.id, {
      notificationEmailPreferences: preferences,
    })
    return res.status(200).json({ success: true, message: "Preferences updated" })
  } catch (error) {
    return fail(res, error, "updateEmailPreferences", "Could not update preferences")
  }
}
