const mongoose = require("mongoose")

/**
 * Append-only product-analytics event stream. Deliberately minimal — one
 * flat collection, no schema-per-verb, no pipeline. The plan's own
 * reasoning: "do not build a pipeline until the dashboards justify it."
 * This exists now because it CAN'T exist retroactively — you cannot
 * backfill an event you never emitted, so it has to be cheap infrastructure
 * built ahead of the BI work (P3) that will eventually read it.
 *
 * verb is intentionally a free string, not an enum, so adding a new event
 * type in a later feature (quizzes, certificates, AI) never requires a
 * schema migration — see EVENT_VERBS below for the current taxonomy,
 * enforced at the call site (emitEvent), not the database.
 */
const eventSchema = new mongoose.Schema({
  // Who did this. Absent for actions taken by an anonymous visitor
  // (e.g. course_viewed, search_performed before login).
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  verb: {
    type: String,
    required: true,
    index: true,
  },
  // What it happened to — a loose {type, id} pair rather than a ref, since
  // the object varies by verb (Course, SubSection, Order, ...) and a
  // single collection can't declare a polymorphic ref cleanly in Mongoose.
  // id is Mixed, not ObjectId — an Order's id is a Razorpay order id
  // string ("order_ABC123"), not a Mongo document id, so a strict
  // ObjectId type would throw a cast error on every checkout_started event.
  object: {
    type: { type: String },
    id: { type: mongoose.Schema.Types.Mixed },
  },
  // Verb-specific extra data (search query, amount, referrer, ...).
  // Deliberately schemaless — forcing a fixed shape here is exactly the
  // kind of premature structure the plan warns against building before
  // there's a dashboard that needs it.
  context: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
})

eventSchema.index({ verb: 1, timestamp: -1 })

module.exports = mongoose.models.Event || mongoose.model("Event", eventSchema)
