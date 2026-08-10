const express = require("express")
const router = express.Router()

const {
  listMyNotifications,
  markRead,
  markAllRead,
  getEmailPreferences,
  updateEmailPreferences,
} = require("../controllers/Notification")
const { auth } = require("../middlewares/auth")

router.get("/", auth, listMyNotifications)
router.patch("/:notificationId/read", auth, markRead)
router.patch("/read-all", auth, markAllRead)
router.get("/preferences", auth, getEmailPreferences)
router.put("/preferences", auth, updateEmailPreferences)

module.exports = router
