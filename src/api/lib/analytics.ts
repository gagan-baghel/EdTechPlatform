/**
 * The arithmetic behind scorecards, rankings and the dashboards' time series.
 *
 * Pure on purpose: the student scorecard, the instructor's roster and the AI
 * assistant's context all grade the same way, so the definition lives once
 * here rather than drifting between three controllers.
 */

export type LetterGrade = "A" | "B" | "C" | "D" | "F"

/**
 * A course score out of 100: half lectures completed, half the average of the
 * best score on every published quiz (an unattempted quiz counts as 0).
 * A course with no quizzes is scored on progress alone.
 */
export function courseScore(progressPercent: number, bestQuizScores: number[]): number {
  const progress = clampPercent(progressPercent)
  if (bestQuizScores.length === 0) return Math.round(progress)
  const quizAverage =
    bestQuizScores.reduce((sum, score) => sum + clampPercent(score), 0) / bestQuizScores.length
  return Math.round(progress * 0.5 + quizAverage * 0.5)
}

export function letterGrade(score: number): LetterGrade {
  if (score >= 90) return "A"
  if (score >= 75) return "B"
  if (score >= 60) return "C"
  if (score >= 40) return "D"
  return "F"
}

/**
 * Standard competition ranking ("1224"): ties share a position, and the next
 * distinct score skips past them. `of` is the size of the class.
 */
export function rankOf(
  userId: string,
  scores: ReadonlyMap<string, number>
): { position: number; of: number } {
  const mine = scores.get(userId) ?? 0
  let ahead = 0
  for (const [id, score] of scores) {
    if (id !== userId && score > mine) ahead += 1
  }
  return { position: ahead + 1, of: Math.max(scores.size, 1) }
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The last `days` UTC calendar days as YYYY-MM-DD, oldest first, ending today.
 * UTC because every `$dateToString` bucket in the aggregations is UTC.
 */
export function dayKeys(days: number, now: number = Date.now()): string[] {
  const keys: string[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(new Date(now - i * DAY_MS).toISOString().slice(0, 10))
  }
  return keys
}

/** Start of the oldest day in `dayKeys(days)`, for the matching `$match`. */
export function sinceDays(days: number, now: number = Date.now()): Date {
  return new Date(`${dayKeys(days, now)[0]}T00:00:00.000Z`)
}

/**
 * Lines an aggregation's sparse `{ _id: day }` rows up against every day in
 * the window, so a chart shows a quiet day as 0 instead of skipping it.
 */
export function zeroFill<TRow extends { _id: string }, TOut>(
  keys: readonly string[],
  rows: readonly TRow[],
  pick: (row: TRow | undefined, date: string) => TOut
): TOut[] {
  const byDay = new Map(rows.map((row) => [row._id, row]))
  return keys.map((date) => pick(byDay.get(date), date))
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}
