import { describe, expect, it, vi } from "vitest"

import { AppError } from "./AppError"
import { fail, parseOrThrow } from "./respond"
import { z } from "zod"
import type { Response } from "express"

/** What `fail` is allowed to put on the wire. */
interface CapturedBody {
  success: false
  message: string
  code?: string
  fieldErrors?: Record<string, string[]>
}

type MockResponse = Response & { statusCode: number; body?: CapturedBody }

/** Minimal Response double — `fail` only ever touches these three members. */
function mockResponse(): MockResponse {
  const res = {
    statusCode: 0,
    body: undefined as CapturedBody | undefined,
    headersSent: false,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: CapturedBody) {
      this.body = payload
      return this
    },
  }
  return res as unknown as MockResponse
}

describe("fail", () => {
  it("never leaks an internal error message to the client", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const res = mockResponse()

    // The kind of thing a driver throws: connection strings, hostnames, paths.
    fail(res, new Error("connect ECONNREFUSED mongodb://user:hunter2@10.0.0.4"), "ctx")

    expect(res.statusCode).toBe(500)
    expect(res.body?.success).toBe(false)
    expect(res.body?.message).toBe(
      "Something went wrong on our end. Please try again."
    )
    expect(JSON.stringify(res.body)).not.toContain("hunter2")
    expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED")
  })

  it("passes through a 4xx message, which we authored", () => {
    const res = mockResponse()
    fail(res, AppError.forbidden("You do not have access to that."), "ctx")

    expect(res.statusCode).toBe(403)
    expect(res.body?.message).toBe("You do not have access to that.")
    expect(res.body?.code).toBe("FORBIDDEN")
  })

  it("uses the caller's safe message for a 5xx instead of the generic one", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const res = mockResponse()
    fail(res, new Error("secret detail"), "ctx", "Failed to create course")

    expect(res.statusCode).toBe(500)
    expect(res.body?.message).toBe("Failed to create course")
    expect(JSON.stringify(res.body)).not.toContain("secret detail")
  })

  it("maps a Mongo duplicate-key error to 409 without echoing the key", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const res = mockResponse()
    fail(res, Object.assign(new Error("E11000 dup key: { email: 'a@b.c' }"), { code: 11000 }), "ctx")

    expect(res.statusCode).toBe(409)
    expect(JSON.stringify(res.body)).not.toContain("a@b.c")
  })

  it("does not write a second response once headers are sent", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const res = mockResponse()
    res.headersSent = true
    fail(res, new Error("boom"), "ctx")

    expect(res.body).toBeUndefined()
  })
})

describe("parseOrThrow", () => {
  const schema = z.object({ email: z.string().email(), age: z.number().min(0) })

  it("returns parsed data on valid input", () => {
    expect(parseOrThrow(schema, { email: "a@b.co", age: 3 })).toEqual({
      email: "a@b.co",
      age: 3,
    })
  })

  it("throws a validation AppError carrying per-field messages", () => {
    try {
      parseOrThrow(schema, { email: "nope", age: -1 })
      throw new Error("should have thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      const appError = error as AppError
      expect(appError.status).toBe(400)
      expect(Object.keys(appError.fieldErrors ?? {})).toEqual(
        expect.arrayContaining(["email", "age"])
      )
    }
  })

  it("strips unknown keys so a caller cannot smuggle extra fields", () => {
    const parsed = parseOrThrow(schema, {
      email: "a@b.co",
      age: 1,
      accountType: "Admin",
    })
    expect(parsed).not.toHaveProperty("accountType")
  })
})
