const mongoose = require("mongoose")

// Binds a Razorpay order to the exact courses and amount it was created for.
// verifyPayment enrolls from THIS record, never from the client request body.
const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  courses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Course",
    },
  ],
  // Stored in paise, exactly as sent to Razorpay, so verification compares like for like.
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["created", "paid"],
    default: "created",
    index: true,
  },
  paymentId: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema)
