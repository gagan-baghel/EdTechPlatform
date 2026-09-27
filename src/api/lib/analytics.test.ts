import { describe, expect, it } from "vitest"

import { courseScore, dayKeys, letterGrade, rankOf, sinceDays, zeroFill } from "./analytics"

describe("courseScore", () => {
  it("scores a quiz-less course on progress alone", () => {
    expect(courseScore(40, [])).toBe(40)
  })

  it("weighs progress and the quiz average equally, unattempted quizzes as 0", () => {
    expect(courseScore(100, [80, 0])).toBe(70)
  })

  it("never lets a corrupt value escape 0..100", () => {
    expect(courseScore(Number.NaN, [150])).toBe(50)
  })
})

describe("letterGrade", () => {
  it("bands at the documented boundaries", () => {
    expect([90, 89, 75, 60, 40, 39].map(letterGrade)).toEqual(["A", "B", "B", "C", "D", "F"])
  })
})

describe("rankOf", () => {
  it("shares a position on a tie and skips past it", () => {
    const scores = new Map([["a", 90], ["b", 90], ["c", 50], ["me", 40]])
    expect(rankOf("b", scores)).toEqual({ position: 1, of: 4 })
    expect(rankOf("me", scores)).toEqual({ position: 4, of: 4 })
  })

  it("treats a student missing from the map as scoring 0", () => {
    expect(rankOf("ghost", new Map([["a", 10]]))).toEqual({ position: 2, of: 1 })
  })
})

describe("day series", () => {
  const now = Date.parse("2026-03-02T15:00:00Z")

  it("lists UTC days oldest first, ending today, across a month boundary", () => {
    expect(dayKeys(3, now)).toEqual(["2026-02-28", "2026-03-01", "2026-03-02"])
    expect(sinceDays(3, now).toISOString()).toBe("2026-02-28T00:00:00.000Z")
  })

  it("zero-fills the days an aggregation skipped", () => {
    const rows = [{ _id: "2026-03-01", n: 5 }]
    expect(zeroFill(dayKeys(3, now), rows, (row, date) => ({ date, n: row?.n ?? 0 }))).toEqual([
      { date: "2026-02-28", n: 0 },
      { date: "2026-03-01", n: 5 },
      { date: "2026-03-02", n: 0 },
    ])
  })
})
