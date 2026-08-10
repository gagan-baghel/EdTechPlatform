const Notification = require("../models/Notification")
const User = require("../models/User")

exports.listMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
    const unreadCount = await Notification.countDocuments({ user: req.user.id, read: false })
    return res.status(200).json({ success: true, data: { notifications, unreadCount } })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load notifications" })
  }
}

exports.markRead = async (req, res) => {
  try {
    const { notificationId } = req.params
    await Notification.updateOne({ _id: notificationId, user: req.user.id }, { $set: { read: true } })
    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not update notification" })
  }
}

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { $set: { read: true } })
    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not update notifications" })
  }
}

exports.getEmailPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("notificationEmailPreferences")
    const preferences = Object.fromEntries(user.notificationEmailPreferences || [])
    return res.status(200).json({ success: true, data: preferences })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load preferences" })
  }
}

exports.updateEmailPreferences = async (req, res) => {
  try {
    const { preferences } = req.body
    if (!preferences || typeof preferences !== "object") {
      return res.status(400).json({ success: false, message: "preferences object is required" })
    }
    // Whitelist boolean values only — this becomes a Mongoose Map, so
    // anything else would either be silently coerced or throw a cast error.
    const sanitized = {}
    for (const [key, value] of Object.entries(preferences)) {
      if (typeof value === "boolean") sanitized[key] = value
    }

    await User.findByIdAndUpdate(req.user.id, { notificationEmailPreferences: sanitized })
    return res.status(200).json({ success: true, message: "Preferences updated" })
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not update preferences" })
  }
}
