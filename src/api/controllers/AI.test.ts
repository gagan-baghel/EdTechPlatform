import { describe, expect, it } from "vitest"

import { parseQuizDraft } from "./AI"

describe("parseQuizDraft", () => {
  const good = { questionText: "2+2?", options: ["3", "4"], correctOptionIndex: 1, explanation: "Arithmetic." }

  it("reads the array out of prose and code fences", () => {
    expect(parseQuizDraft("Here you go:\n```json\n" + JSON.stringify([good]) + "\n```")).toEqual([good])
  })

  it("keeps the well-formed questions and drops the rest", () => {
    const outOfRange = { ...good, correctOptionIndex: 5 }
    const oneOption = { ...good, options: ["only"] }
    expect(parseQuizDraft(JSON.stringify([outOfRange, good, oneOption, "junk"]))).toEqual([good])
  })

  it("returns nothing, not a throw, for unparseable output", () => {
    expect(parseQuizDraft("I can't do that")).toEqual([])
    expect(parseQuizDraft("[{broken")).toEqual([])
  })
})
