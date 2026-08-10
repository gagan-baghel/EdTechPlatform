/**
 * @param {string|Date} dateString
 * @param {string} [timezone] - IANA zone (e.g. "Asia/Kolkata"). Omitted =
 *   the viewer's own browser timezone, same as this always behaved.
 *   Callers that have a user's stored Profile.timezone (Settings >
 *   Appearance) should pass it through; most call sites don't need to.
 */
export const formatDate = (dateString, timezone) => {
  const date = new Date(dateString)

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: timezone || undefined,
  })

  const timeParts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone || undefined,
  }).formatToParts(date)

  const hour = timeParts.find((p) => p.type === "hour")?.value ?? ""
  const minute = timeParts.find((p) => p.type === "minute")?.value ?? ""
  const period = timeParts.find((p) => p.type === "dayPeriod")?.value ?? ""

  return `${dateFormatter.format(date)} | ${hour}:${minute} ${period}`
}
