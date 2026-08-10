import express from "express"
import { authedHandler } from "../lib/http"
const router = express.Router()

import {
  listMyNotifications,
  markRead,
  markAllRead,
  getEmailPreferences,
  updateEmailPreferences,
} from "../controllers/Notification"
import { auth } from "../middlewares/auth"

router.get("/", auth, authedHandler(listMyNotifications, "listMyNotifications"))
router.patch("/:notificationId/read", auth, authedHandler(markRead, "markRead"))
router.patch("/read-all", auth, authedHandler(markAllRead, "markAllRead"))
router.get("/preferences", auth, authedHandler(getEmailPreferences, "getEmailPreferences"))
router.put("/preferences", auth, authedHandler(updateEmailPreferences, "updateEmailPreferences"))
export default router