const Event = require("../models/Event")

/**
 * The full current taxonomy (plan §4). Not a database enum — see Event.js
 * for why — this is the single place that documents which verbs exist, so
 * a future P3 dashboard has one file to read instead of grepping every
 * controller. Verbs not yet wired to a real call site (no feature exists
 * yet to emit them from) are commented with where they'll be added.
 */
const EVENT_VERBS = {
  COURSE_VIEWED: "course_viewed",
  LECTURE_STARTED: "lecture_started", // wired when progress v2 lands (P1)
  LECTURE_PROGRESSED: "lecture_progressed", // wired when progress v2 lands (P1)
  LECTURE_ABANDONED: "lecture_abandoned", // wired when progress v2 lands (P1)
  LECTURE_COMPLETED: "lecture_completed",
  QUIZ_ATTEMPTED: "quiz_attempted", // wired when quizzes ship (P2)
  QUIZ_PASSED: "quiz_passed", // wired when quizzes ship (P2)
  SEARCH_PERFORMED: "search_performed",
  CHECKOUT_STARTED: "checkout_started",
  PURCHASE_COMPLETED: "purchase_completed",
  REFUND_ISSUED: "refund_issued", // wired when the refund system lands (P1)
  CERTIFICATE_EARNED: "certificate_earned", // wired when certificates ship (P2)
  AI_INTERACTION: "ai_interaction", // wired when the AI tutor ships (P2)
}

/**
 * Fire-and-forget: an event-logging failure must never break the request
 * that triggered it. Same pattern already used for enrolment emails in
 * Payments.js — the side effect is best-effort, the primary action is not.
 *
 * @param {string} verb - one of EVENT_VERBS
 * @param {object} [options]
 * @param {string|null} [options.actor] - user id, or null for anonymous
 * @param {{type: string, id: string}} [options.object]
 * @param {object} [options.context]
 */
async function emitEvent(verb, { actor = null, object, context = {} } = {}) {
  try {
    await Event.create({ actor, verb, object, context })
  } catch (error) {
    console.error("emitEvent failed", verb, error.message)
  }
}

module.exports = { emitEvent, EVENT_VERBS }
