const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
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

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema)
