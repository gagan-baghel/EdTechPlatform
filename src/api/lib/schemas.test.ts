import { describe, expect, it } from "vitest"
import { z } from "zod"

import { AppError } from "./AppError"
import { parseOrThrow } from "./respond"
import { email, httpsUrl, objectId, paginationQuery, rupees, text, toSkip } from "./schemas"

const VALID_ID = "507f1f77bcf86cd799439011"

/**
 * These are the regression tests for the injection class that made password
 * reset an account takeover.
 *
 * Express parses `?token[$gt]=` and `{"token":{"$gt":""}}` into an OBJECT.
 * Mongoose accepts `$gt` as a query operator, so `User.findOne({ token })`
 * with that object matched the first account with ANY outstanding reset token.
 * Every one of these asserts that the object never gets through the schema.
 */
const OPERATOR_PAYLOADS: unknown[] = [
  { $ne: null },
  { $gt: "" },
  { $regex: ".*" },
  { $exists: true },
  ["a", "b"],
  { $where: "true" },
]

describe("objectId", () => {
  it("accepts a well-formed id", () => {
    expect(objectId().parse(VALID_ID)).toBe(VALID_ID)
  })

  it("rejects a Mongo operator object", () => {
    for (const payload of OPERATOR_PAYLOADS) {
      expect(objectId().safeParse(payload).success).toBe(false)
    }
  })

  it("rejects a malformed id string", () => {
    expect(objectId().safeParse("not-an-id").success).toBe(false)
    expect(objectId().safeParse("").success).toBe(false)
  })
})

describe("email", () => {
  it("normalises case and surrounding whitespace", () => {
    // Two accounts differing only in case is a data-integrity bug the unique
    // index cannot catch on its own.
    expect(email().parse("  Person@Example.COM ")).toBe("person@example.com")
  })

  it("rejects a Mongo operator object", () => {
    for (const payload of OPERATOR_PAYLOADS) {
      expect(email().safeParse(payload).success).toBe(false)
    }
  })

  it("rejects something that is not an address", () => {
    expect(email().safeParse("nope").success).toBe(false)
  })
})

describe("text", () => {
  it("trims and enforces the length ceiling", () => {
    expect(text({ max: 10 }).parse("  hi  ")).toBe("hi")
    expect(text({ max: 3 }).safeParse("abcd").success).toBe(false)
  })

  it("rejects an empty string and an operator object", () => {
    expect(text().safeParse("   ").success).toBe(false)
    expect(text().safeParse({ $ne: null }).success).toBe(false)
  })
})

describe("httpsUrl", () => {
  it("accepts an https link on an allowed host, including subdomains", () => {
    const schema = httpsUrl(["res.cloudinary.com"])
    expect(schema.safeParse("https://res.cloudinary.com/demo/a.pdf").success).toBe(true)
    expect(schema.safeParse("https://cdn.res.cloudinary.com/a.pdf").success).toBe(true)
  })

  it("rejects a link on any other host", () => {
    // The whole point: a lecture attachment must not be able to point at an
    // attacker's page and borrow the course's credibility.
    const schema = httpsUrl(["res.cloudinary.com"])
    expect(schema.safeParse("https://evil.example.com/a.pdf").success).toBe(false)
    // Suffix trickery — "notres.cloudinary.com.evil.com" must not pass.
    expect(schema.safeParse("https://res.cloudinary.com.evil.com/a").success).toBe(false)
  })

  it("rejects non-https schemes", () => {
    const schema = httpsUrl(["res.cloudinary.com"])
    expect(schema.safeParse("http://res.cloudinary.com/a.pdf").success).toBe(false)
    expect(schema.safeParse("javascript:alert(1)").success).toBe(false)
    expect(schema.safeParse("not a url").success).toBe(false)
  })
})

describe("rupees", () => {
  it("rejects negative amounts", () => {
    // A negative flat coupon inverts the discount arithmetic and charges the
    // customer MORE than the listed price.
    expect(rupees().safeParse(-1).success).toBe(false)
  })

  it("rejects NaN and Infinity", () => {
    expect(rupees().safeParse("abc").success).toBe(false)
    expect(rupees().safeParse(Infinity).success).toBe(false)
  })

  it("accepts a normal amount", () => {
    expect(rupees().parse("499")).toBe(499)
  })
})

describe("paginationQuery", () => {
  it("defaults when absent and clamps an oversized page size", () => {
    expect(paginationQuery().parse({})).toEqual({ page: 1, limit: 25 })
    // Nobody gets to ask for the whole collection.
    expect(paginationQuery({ maxLimit: 100 }).parse({ limit: "100000" }).limit).toBe(25)
  })

  it("falls back rather than throwing on junk", () => {
    expect(paginationQuery().parse({ page: "abc", limit: {} })).toEqual({ page: 1, limit: 25 })
  })

  it("computes skip from page and limit", () => {
    expect(toSkip({ page: 3, limit: 20 })).toEqual({ page: 3, limit: 20, skip: 40 })
  })
})

describe("parseOrThrow", () => {
  it("throws a 400 AppError carrying per-field messages", () => {
    const schema = z.object({ courseId: objectId("A valid course id is required") })

    try {
      parseOrThrow(schema, { courseId: { $ne: null } })
      throw new Error("should have thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      const appError = error as AppError
      expect(appError.status).toBe(400)
      expect(appError.code).toBe("VALIDATION_FAILED")
      expect(appError.fieldErrors?.courseId).toContain("A valid course id is required")
    }
  })

  it("strips unknown keys so extra fields cannot be smuggled into an update", () => {
    const schema = z.object({ title: text({ max: 50 }) })
    expect(parseOrThrow(schema, { title: "ok", accountType: "Admin" })).toEqual({ title: "ok" })
  })
})
