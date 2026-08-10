import { describe, expect, it } from "vitest"
import type { Request } from "express"

import { pagination, queryNumber, queryString, singleFile } from "./request"
import { containsId, sameId } from "./ids"

const req = (query: Record<string, unknown>) =>
  ({ query }) as unknown as Request

describe("queryString", () => {
  it("reads a plain string", () => {
    expect(queryString(req({ q: "hello" }), "q")).toBe("hello")
  })

  it("takes the first value when a parameter is repeated", () => {
    expect(queryString(req({ q: ["a", "b"] }), "q")).toBe("a")
  })

  /**
   * The one that matters: ?accountType[$ne]=Admin arrives as an OBJECT.
   * Assigning that into a Mongo filter injects an operator — an equality
   * check silently becomes "everything except Admin".
   */
  it("refuses a structured value rather than passing an object through", () => {
    expect(queryString(req({ accountType: { $ne: "Admin" } }), "accountType")).toBeUndefined()
  })

  it("returns undefined for an absent key", () => {
    expect(queryString(req({}), "missing")).toBeUndefined()
  })
})

describe("queryNumber", () => {
  it("parses a numeric string", () => {
    expect(queryNumber(req({ page: "3" }), "page")).toBe(3)
  })

  it("returns undefined for non-numeric input rather than NaN", () => {
    expect(queryNumber(req({ page: "abc" }), "page")).toBeUndefined()
    expect(queryNumber(req({ page: { $gt: 1 } }), "page")).toBeUndefined()
  })
})

describe("pagination", () => {
  it("defaults when nothing is supplied", () => {
    expect(pagination(req({}))).toEqual({ page: 1, pageSize: 20, skip: 0 })
  })

  it("clamps pageSize so a caller cannot scan the collection", () => {
    expect(pagination(req({ pageSize: "100000" })).pageSize).toBe(100)
  })

  it("rejects a page below 1", () => {
    expect(pagination(req({ page: "-5" })).page).toBe(1)
  })

  it("computes skip from the clamped values", () => {
    expect(pagination(req({ page: "3", pageSize: "10" })).skip).toBe(20)
  })
})

describe("singleFile", () => {
  it("returns the file when one was uploaded", () => {
    const file = { name: "a.png" }
    const r = { files: { thumbnail: file } } as unknown as Request
    expect(singleFile(r, "thumbnail")).toBe(file)
  })

  it("takes the first when a field is repeated", () => {
    const a = { name: "a.png" }
    const r = { files: { thumbnail: [a, { name: "b.png" }] } } as unknown as Request
    expect(singleFile(r, "thumbnail")).toBe(a)
  })

  it("returns undefined when nothing was uploaded", () => {
    expect(singleFile({ files: undefined } as unknown as Request, "x")).toBeUndefined()
  })
})

describe("id comparison", () => {
  /**
   * `ObjectId === string` is always false. In an access check that means
   * either locking out the owner or, inverted, letting the wrong user through.
   */
  it("matches an ObjectId-like value against its string form", () => {
    const oid = { toString: () => "507f1f77bcf86cd799439011" }
    expect(sameId(oid, "507f1f77bcf86cd799439011")).toBe(true)
  })

  it("does not treat null/undefined as a match", () => {
    expect(sameId(null, null)).toBe(false)
    expect(sameId(undefined, "x")).toBe(false)
  })

  it("finds membership across mixed id representations", () => {
    const ids = [{ toString: () => "a1" }, "b2"]
    expect(containsId(ids, "a1")).toBe(true)
    expect(containsId(ids, "b2")).toBe(true)
    expect(containsId(ids, "c3")).toBe(false)
  })

  it("treats an empty or missing list as no access", () => {
    expect(containsId([], "a")).toBe(false)
    expect(containsId(undefined, "a")).toBe(false)
    expect(containsId(["a"], undefined)).toBe(false)
  })
})
