import type { NextFunction, Request, Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

interface Record_ {
  _id: string
  key: string
  hits: number
  expiresAt: Date
}

/**
 * An in-memory stand-in for the `RateLimit` collection with the same
 * conditional-update semantics Mongo gives us, so the window logic can be
 * exercised without a database.
 */
const store = new Map<string, Record_>()

const RateLimitMock = {
  findOneAndUpdate: vi.fn(
    (
      filter: { key?: string; _id?: string; expiresAt?: Date },
      update: { $inc?: { hits: number }; $set?: Partial<Record_>; $setOnInsert?: Partial<Record_> },
      options?: { upsert?: boolean }
    ) => {
      const existing = filter.key
        ? store.get(filter.key)
        : [...store.values()].find((r) => r._id === filter._id)

      // Conditional update: an `expiresAt` in the filter must still match.
      if (existing && filter.expiresAt && existing.expiresAt.getTime() !== filter.expiresAt.getTime()) {
        return Promise.resolve(null)
      }

      if (!existing) {
        if (!options?.upsert || !filter.key) return Promise.resolve(null)
        const created: Record_ = {
          _id: `id_${store.size}`,
          key: filter.key,
          hits: update.$inc?.hits ?? 0,
          expiresAt: (update.$setOnInsert?.expiresAt as Date) ?? new Date(),
        }
        store.set(filter.key, created)
        return Promise.resolve({ ...created })
      }

      if (update.$inc?.hits) existing.hits += update.$inc.hits
      if (update.$set) Object.assign(existing, update.$set)
      return Promise.resolve({ ...existing })
    }
  ),
  findById: vi.fn((id: string) =>
    Promise.resolve([...store.values()].find((r) => r._id === id) ?? null)
  ),
}

vi.mock("../lib/mongoose", () => ({ defineModel: () => RateLimitMock }))

const { rateLimit } = await import("./rateLimit")

function run(limiter: ReturnType<typeof rateLimit>) {
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))
  const set = vi.fn()
  const next = vi.fn() as NextFunction
  const req = { headers: { "x-forwarded-for": "1.2.3.4" }, body: {}, socket: {} } as unknown as Request
  const res = { status, json, set } as unknown as Response

  limiter(req, res, next)
  // The middleware body is an IIFE; let its microtasks drain.
  return new Promise<{ next: NextFunction; status: typeof status; json: typeof json }>((resolve) =>
    setTimeout(() => resolve({ next, status, json }), 0)
  )
}

describe("rateLimit", () => {
  beforeEach(() => {
    store.clear()
    vi.clearAllMocks()
  })

  it("allows requests up to the limit", async () => {
    const limiter = rateLimit({ name: "login", max: 3, windowMs: 60_000 })

    for (let i = 0; i < 3; i += 1) {
      const { next, status } = await run(limiter)
      expect(next).toHaveBeenCalled()
      expect(status).not.toHaveBeenCalled()
    }
  })

  it("blocks with 429 once the limit is exceeded", async () => {
    const limiter = rateLimit({ name: "login", max: 2, windowMs: 60_000 })

    await run(limiter)
    await run(limiter)
    const { next, status, json } = await run(limiter)

    expect(next).not.toHaveBeenCalled()
    expect(status).toHaveBeenCalledWith(429)
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: "RATE_LIMITED" }))
  })

  it("starts a new window once the old one has elapsed", async () => {
    /**
     * This is the regression test for the lockout.
     *
     * Window expiry used to be left entirely to a Mongo TTL index that was
     * never created (autoIndex is off and the migration didn't build it), so
     * `hits` grew forever: any account that reached ten failed logins could
     * never sign in again. Expiry is now enforced in the middleware itself.
     */
    const limiter = rateLimit({ name: "login", max: 1, windowMs: 60_000 })

    await run(limiter)
    const blocked = await run(limiter)
    expect(blocked.status).toHaveBeenCalledWith(429)

    // Move the stored window into the past, as real elapsed time would.
    for (const record of store.values()) record.expiresAt = new Date(Date.now() - 1)

    const afterWindow = await run(limiter)
    expect(afterWindow.next).toHaveBeenCalled()
    expect(afterWindow.status).not.toHaveBeenCalled()
  })

  it("keeps separate buckets per limiter name", async () => {
    const login = rateLimit({ name: "login", max: 1, windowMs: 60_000 })
    const signup = rateLimit({ name: "signup", max: 1, windowMs: 60_000 })

    await run(login)
    const blockedLogin = await run(login)
    expect(blockedLogin.status).toHaveBeenCalledWith(429)

    // A different limiter must not inherit the exhausted allowance.
    const firstSignup = await run(signup)
    expect(firstSignup.next).toHaveBeenCalled()
  })

  it("fails open when the limiter itself is unavailable", async () => {
    // A limiter outage must not take authentication down with it.
    RateLimitMock.findOneAndUpdate.mockRejectedValueOnce(new Error("mongo down") as never)
    const limiter = rateLimit({ name: "login", max: 1, windowMs: 60_000 })

    const { next, status } = await run(limiter)

    expect(next).toHaveBeenCalled()
    expect(status).not.toHaveBeenCalled()
  })
})
