import { Schema } from "mongoose"

import type { Notification as NotificationEntity } from "@/types/domain"
import { defineModel, type ObjectId, type SchemaOf } from "../lib/mongoose"

const notificationSchema = new Schema<SchemaOf<NotificationEntity<ObjectId>>>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    // Deep link into the exact lecture/order/course the notification is
    // about, per plan §4 ("deep links into the exact lecture or order").
    link: { type: String, default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
)

notificationSchema.index({ user: 1, read: 1, createdAt: -1 })
export const Notification = defineModel("Notification", notificationSchema)
export default Notification