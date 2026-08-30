import type { Request, Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { hashToken } from "../lib/crypto"

const USER_ID = "507f1f77bcf86cd799439011"

vi.mock("../models/User", () => ({
  default: { findOne: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn() },
}))
vi.mock("../models/Session", () => ({ default: { updateMany: vi.fn() } }))
vi.mock("../utils/mailSender", () => ({ default: vi.fn() }))

const { resetPassword, resetPasswordToken } = await import("./ResetPassword")
const User = (await import("../models/User")).default
const Session = (await import("../models/Session")).default
const mailSender = (await import("../utils/mailSender")).default

function makeRes() {
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))
  return { res: { status, json, headersSent: false } as unknown as Response, status, json }
}

const body = (value: Record<string, unknown>) => ({ body: value }) as unknown as Request

/** `findOneAndUpdate(...).select("+token")` — chainable like the real query. */
const selectResolving = (value: unknown) => ({ select: vi.fn().mockResolvedValue(value) })

describe("resetPassword", () => {
  beforeEach(() => vi.clearAllMocks())

  /**
   * The vulnerability this replaces.
   *
   * `const { token } = req.body` then `User.findOne({ token })`: Express parses
   * `{"token":{"$gt":""}}` into an object, Mongoose treats `$gt` as an operator,
   * and the query matched the FIRST account with any outstanding reset token —
   * a full account takeover from one unauthenticated request.
   */
  it.each([
    { $gt: "" },
    { $ne: null },
    { $regex: ".*" },
    { $exists: true },
    ["a"],
  ])("rejects a Mongo operator as the token (%j)", async (token) => {
    const { res, status } = makeRes()

    await resetPassword(
      body({ token, password: "longenough123", confirmPassword: "longenough123" }),
      res
    )

    expect(status).toHaveBeenCalledWith(400)
    expect(User.findOneAndUpdate).not.toHaveBeenCalled()
    expect(User.updateOne).not.toHaveBeenCalled()
  })

  it("looks the token up by hash, never by its raw value", async () => {
    const raw = "a".repeat(64)
    vi.mocked(User.findOneAndUpdate).mockReturnValue(selectResolving({ _id: USER_ID }) as never)
    const { res, status } = makeRes()

    await resetPassword(body({ token: raw, password: "longenough123", confirmPassword: "longenough123" }), res)

    expect(status).toHaveBeenCalledWith(200)
    const filter = vi.mocked(User.findOneAndUpdate).mock.calls[0]![0]!
    // Only the hash is stored, so a database read cannot be replayed as a reset.
    expect(filter.token).toBe(hashToken(raw))
    expect(filter.token).not.toBe(raw)
  })

  it("consumes the token in the same operation that matches it", async () => {
    const raw = "b".repeat(64)
    vi.mocked(User.findOneAndUpdate).mockReturnValue(selectResolving({ _id: USER_ID }) as never)
    const { res } = makeRes()

    await resetPassword(body({ token: raw, password: "longenough123", confirmPassword: "longenough123" }), res)

    const call = vi.mocked(User.findOneAndUpdate).mock.calls[0]!
    const filter = call[0]!
    const update = call[1]
    // Expiry is part of the match, and the token is unset atomically — a
    // read-then-write would let two submissions of one link both succeed.
    expect(filter.resetPasswordExpires).toEqual({ $gt: expect.any(Date) })
    expect(update).toEqual({ $unset: { token: 1, resetPasswordExpires: 1 } })
  })

  it("revokes every session after a successful reset", async () => {
    vi.mocked(User.findOneAndUpdate).mockReturnValue(selectResolving({ _id: USER_ID }) as never)
    const { res } = makeRes()

    await resetPassword(
      body({ token: "c".repeat(64), password: "longenough123", confirmPassword: "longenough123" }),
      res
    )

    // "I may have lost control of my account" — every device gets logged out.
    expect(Session.updateMany).toHaveBeenCalledWith(
      { user: USER_ID },
      { $set: { revoked: true } }
    )
  })

  it("rejects an expired or already-used link with the same message", async () => {
    vi.mocked(User.findOneAndUpdate).mockReturnValue(selectResolving(null) as never)
    const { res, status, json } = makeRes()

    await resetPassword(
      body({ token: "d".repeat(64), password: "longenough123", confirmPassword: "longenough123" }),
      res
    )

    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    )
    expect(User.updateOne).not.toHaveBeenCalled()
  })

  it("rejects a password below the minimum length", async () => {
    const { res, status } = makeRes()
    await resetPassword(body({ token: "e".repeat(64), password: "short", confirmPassword: "short" }), res)
    expect(status).toHaveBeenCalledWith(400)
    expect(User.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it("rejects mismatched confirmation", async () => {
    const { res, status } = makeRes()
    await resetPassword(
      body({ token: "f".repeat(64), password: "longenough123", confirmPassword: "different1234" }),
      res
    )
    expect(status).toHaveBeenCalledWith(400)
    expect(User.findOneAndUpdate).not.toHaveBeenCalled()
  })
})

describe("resetPasswordToken", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects a Mongo operator as the email", async () => {
    const { res, status } = makeRes()

    await resetPasswordToken(body({ email: { $ne: null } }), res)

    expect(status).toHaveBeenCalledWith(400)
    expect(User.findOne).not.toHaveBeenCalled()
  })

  it("answers identically for a known and an unknown address", async () => {
    // Otherwise this endpoint enumerates which addresses have accounts.
    vi.mocked(User.findOne).mockResolvedValue(null as never)
    const unknown = makeRes()
    await resetPasswordToken(body({ email: "nobody@example.com" }), unknown.res)

    vi.mocked(User.findOne).mockResolvedValue({ _id: USER_ID } as never)
    const known = makeRes()
    await resetPasswordToken(body({ email: "somebody@example.com" }), known.res)

    expect(unknown.status).toHaveBeenCalledWith(200)
    expect(known.status).toHaveBeenCalledWith(200)
    expect(unknown.json.mock.calls[0]).toEqual(known.json.mock.calls[0])
  })

  it("stores only the hash of the token it emails", async () => {
    vi.mocked(User.findOne).mockResolvedValue({ _id: USER_ID } as never)
    const { res } = makeRes()

    await resetPasswordToken(body({ email: "person@example.com" }), res)

    const update = vi.mocked(User.updateOne).mock.calls[0]![1]
    const stored = (update as { $set: { token: string } }).$set.token

    const html = vi.mocked(mailSender).mock.calls[0]![2]
    const emailedToken = /update-password\/([a-f0-9]+)/.exec(html)?.[1]

    expect(emailedToken).toBeTruthy()
    expect(stored).toBe(hashToken(emailedToken!))
    expect(html).not.toContain(stored)
  })

  it("normalises the address before looking it up", async () => {
    vi.mocked(User.findOne).mockResolvedValue(null as never)
    const { res } = makeRes()

    await resetPasswordToken(body({ email: "  Person@Example.COM " }), res)

    expect(User.findOne).toHaveBeenCalledWith({ email: "person@example.com" })
  })
})
