import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import {
  api,
  clearDatabase,
  createUser,
  ensureIndexes,
  startTestServer,
  stopTestServer,
} from "../test/harness"
import { resetMailFake, sentMail } from "../test/fakes/nodemailer"
import { hashToken } from "../lib/crypto"

/**
 * The account lifecycle against a real database: sign up with a real OTP,
 * sign in, change a password, reset a forgotten one, and have sessions
 * actually stop working when they are revoked.
 */

beforeAll(async () => {
  await startTestServer()
  await ensureIndexes()
}, 60000)

afterAll(async () => {
  await stopTestServer()
})

beforeEach(async () => {
  await clearDatabase()
  await ensureIndexes()
  resetMailFake()
})

const PASSWORD = "correct-horse-battery-staple"

async function requestOtp(email: string) {
  return api().post("/api/v1/auth/sendotp").send({ email })
}

/** Reads the OTP out of the database, the way a user reads it out of an email. */
async function currentOtp(email: string): Promise<string> {
  const OTP = (await import("../models/OTP")).default
  // Stored against the normalised address, the way the controller writes it.
  const row = await OTP.findOne({ email: email.trim().toLowerCase() }).sort({ createdAt: -1 })
  return String(row!.otp)
}

async function signUp(email: string, extra: Record<string, unknown> = {}) {
  await requestOtp(email)
  return api().post("/api/v1/auth/signup").send({
    firstName: "New",
    lastName: "Learner",
    email,
    password: PASSWORD,
    confirmPassword: PASSWORD,
    accountType: "Student",
    otp: await currentOtp(email),
    ...extra,
  })
}

describe("signup", () => {
  it("creates an account after a real OTP round trip", async () => {
    const email = "new.learner@example.com"
    const res = await signUp(email)
    expect(res.status).toBe(200)

    const User = (await import("../models/User")).default
    const user = await User.findOne({ email }).select("+password")
    expect(user).not.toBeNull()
    expect(user!.accountType).toBe("Student")
    // Never stored in the clear.
    expect(user!.password).not.toBe(PASSWORD)
    // A profile is always created alongside; the account is unusable without one.
    expect(user!.additionalDetails).toBeTruthy()
  })

  it("emails the verification code", async () => {
    await requestOtp("codes@example.com")
    expect(sentMail.some((m) => m.to === "codes@example.com")).toBe(true)
  })

  it("rejects a wrong code and counts the attempt", async () => {
    const email = "wrongcode@example.com"
    await requestOtp(email)
    const res = await api().post("/api/v1/auth/signup").send({
      firstName: "A", lastName: "B", email, password: PASSWORD,
      confirmPassword: PASSWORD, accountType: "Student", otp: "000000",
    })
    expect(res.status).toBe(400)

    const OTP = (await import("../models/OTP")).default
    expect((await OTP.findOne({ email }))!.attempts).toBe(1)

    const User = (await import("../models/User")).default
    expect(await User.findOne({ email })).toBeNull()
  })

  it("locks the code out after repeated wrong guesses", async () => {
    const email = "bruteforce@example.com"
    await requestOtp(email)
    const attempt = () =>
      api().post("/api/v1/auth/signup").send({
        firstName: "A", lastName: "B", email, password: PASSWORD,
        confirmPassword: PASSWORD, accountType: "Student", otp: "000000",
      })

    for (let i = 0; i < 5; i += 1) await attempt()
    expect((await attempt()).status).toBe(429)
  })

  it("consumes the code, so it cannot be replayed", async () => {
    const email = "replay@example.com"
    await requestOtp(email)
    const otp = await currentOtp(email)
    const body = {
      firstName: "A", lastName: "B", email, password: PASSWORD,
      confirmPassword: PASSWORD, accountType: "Student", otp,
    }
    expect((await api().post("/api/v1/auth/signup").send(body)).status).toBe(200)
    // Second attempt: same code, no OTP row left.
    expect((await api().post("/api/v1/auth/signup").send(body)).status).not.toBe(200)
  })

  it("refuses to self-provision an Admin", async () => {
    const email = "wannabe.admin@example.com"
    await requestOtp(email)
    const res = await api().post("/api/v1/auth/signup").send({
      firstName: "A", lastName: "B", email, password: PASSWORD,
      confirmPassword: PASSWORD, accountType: "Admin", otp: await currentOtp(email),
    })
    expect(res.status).toBe(400)
  })

  it("treats addresses case-insensitively", async () => {
    expect((await signUp("Casing@Example.com")).status).toBe(200)

    const User = (await import("../models/User")).default
    // Normalised on the way in, so the byte-exact unique index can do its job.
    expect(await User.countDocuments({ email: "casing@example.com" })).toBe(1)

    // The differently-cased address is recognised as already taken, at the
    // first step of the flow rather than at the unique index.
    expect((await requestOtp("casing@example.com")).status).toBe(403)
    expect((await requestOtp("CASING@EXAMPLE.COM")).status).toBe(403)
  })

  it("rejects a short password", async () => {
    const email = "shortpw@example.com"
    await requestOtp(email)
    const res = await api().post("/api/v1/auth/signup").send({
      firstName: "A", lastName: "B", email, password: "short",
      confirmPassword: "short", accountType: "Student", otp: await currentOtp(email),
    })
    expect(res.status).toBe(400)
  })
})

describe("login", () => {
  it("issues a working token and a session", async () => {
    const email = "signin@example.com"
    await signUp(email)

    const res = await api().post("/api/v1/auth/login").send({ email, password: PASSWORD })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    // The hash must never come back with the user.
    expect(res.body.user.password).toBeUndefined()

    const me = await api()
      .get("/api/v1/profile/getUserDetails")
      .set("Authorization", `Bearer ${res.body.token}`)
    expect(me.status).toBe(200)
  })

  it("rejects a wrong password", async () => {
    const email = "wrongpw@example.com"
    await signUp(email)
    expect((await api().post("/api/v1/auth/login").send({ email, password: "nope-nope-nope" })).status).toBe(401)
  })

  it("accepts a differently-cased address", async () => {
    await signUp("mixed.case@example.com")
    const res = await api().post("/api/v1/auth/login").send({ email: "Mixed.Case@Example.com", password: PASSWORD })
    expect(res.status).toBe(200)
  })

  it("refuses a suspended account", async () => {
    const email = "suspended@example.com"
    await signUp(email)
    const User = (await import("../models/User")).default
    await User.updateOne({ email }, { $set: { active: false } })

    expect((await api().post("/api/v1/auth/login").send({ email, password: PASSWORD })).status).toBe(403)
  })

  it("rejects a Mongo operator in place of an email", async () => {
    await signUp("victim@example.com")
    const res = await api()
      .post("/api/v1/auth/login")
      .send({ email: { $ne: null }, password: PASSWORD })
    expect(res.status).toBe(400)
  })
})

describe("sessions", () => {
  it("stops accepting a token once its session is revoked", async () => {
    const user = await createUser("Student")
    expect((await api().get("/api/v1/profile/getUserDetails").set(user.auth)).status).toBe(200)

    expect((await api().post("/api/v1/auth/logout").set(user.auth)).status).toBe(200)

    // A JWT stays signature-valid for its full lifetime; the session record is
    // what makes logout mean anything.
    expect((await api().get("/api/v1/profile/getUserDetails").set(user.auth)).status).toBe(401)
  })

  it("revokes other devices on a password change but keeps this one", async () => {
    const email = "multidevice@example.com"
    await signUp(email)
    const a = await api().post("/api/v1/auth/login").send({ email, password: PASSWORD })
    const b = await api().post("/api/v1/auth/login").send({ email, password: PASSWORD })

    const changed = await api()
      .post("/api/v1/auth/changePassword")
      .set("Authorization", `Bearer ${b.body.token}`)
      .send({ oldPassword: PASSWORD, newPassword: "a-brand-new-password" })
    expect(changed.status).toBe(200)

    const stillHere = await api().get("/api/v1/profile/getUserDetails").set("Authorization", `Bearer ${b.body.token}`)
    const kickedOut = await api().get("/api/v1/profile/getUserDetails").set("Authorization", `Bearer ${a.body.token}`)
    expect(stillHere.status).toBe(200)
    expect(kickedOut.status).toBe(401)
  })
})

describe("password reset", () => {
  it("stores only the hash of the token it emails", async () => {
    const email = "forgot@example.com"
    await signUp(email)
    resetMailFake()

    expect((await api().post("/api/v1/auth/reset-password-token").send({ email })).status).toBe(200)

    const mail = sentMail.find((m) => m.to === email)!
    const raw = /update-password\/([a-f0-9]+)/.exec(mail.html)![1]!

    const User = (await import("../models/User")).default
    const user = await User.findOne({ email }).select("+token")
    // A database read must not be replayable as a reset.
    expect(user!.token).toBe(hashToken(raw))
    expect(user!.token).not.toBe(raw)
  })

  it("completes a reset and lets the new password sign in", async () => {
    const email = "resetme@example.com"
    await signUp(email)
    resetMailFake()
    await api().post("/api/v1/auth/reset-password-token").send({ email })
    const raw = /update-password\/([a-f0-9]+)/.exec(sentMail.find((m) => m.to === email)!.html)![1]!

    const res = await api().post("/api/v1/auth/reset-password").send({
      token: raw, password: "an-entirely-new-password", confirmPassword: "an-entirely-new-password",
    })
    expect(res.status).toBe(200)

    expect((await api().post("/api/v1/auth/login").send({ email, password: "an-entirely-new-password" })).status).toBe(200)
    expect((await api().post("/api/v1/auth/login").send({ email, password: PASSWORD })).status).toBe(401)
  })

  it("burns the link after one use", async () => {
    const email = "singleuse@example.com"
    await signUp(email)
    resetMailFake()
    await api().post("/api/v1/auth/reset-password-token").send({ email })
    const raw = /update-password\/([a-f0-9]+)/.exec(sentMail.find((m) => m.to === email)!.html)![1]!
    const body = { token: raw, password: "first-new-password", confirmPassword: "first-new-password" }

    expect((await api().post("/api/v1/auth/reset-password").send(body)).status).toBe(200)
    expect((await api().post("/api/v1/auth/reset-password").send(body)).status).toBe(400)
  })

  it("logs every device out after a reset", async () => {
    const email = "resetsessions@example.com"
    await signUp(email)
    const session = await api().post("/api/v1/auth/login").send({ email, password: PASSWORD })
    resetMailFake()

    await api().post("/api/v1/auth/reset-password-token").send({ email })
    const raw = /update-password\/([a-f0-9]+)/.exec(sentMail.find((m) => m.to === email)!.html)![1]!
    await api().post("/api/v1/auth/reset-password").send({
      token: raw, password: "post-reset-password", confirmPassword: "post-reset-password",
    })

    // "I may have lost control of my account" — nothing survives.
    const res = await api().get("/api/v1/profile/getUserDetails").set("Authorization", `Bearer ${session.body.token}`)
    expect(res.status).toBe(401)
  })

  it("cannot be driven with a Mongo operator instead of a token", async () => {
    const email = "injection@example.com"
    await signUp(email)
    await api().post("/api/v1/auth/reset-password-token").send({ email })

    // The exploit: match ANY user holding an outstanding reset token.
    const res = await api().post("/api/v1/auth/reset-password").send({
      token: { $gt: "" }, password: "attacker-chosen-password", confirmPassword: "attacker-chosen-password",
    })
    expect(res.status).toBe(400)

    // The victim's password is untouched.
    expect((await api().post("/api/v1/auth/login").send({ email, password: PASSWORD })).status).toBe(200)
  })

  it("says the same thing for a known and an unknown address", async () => {
    await signUp("real.person@example.com")
    const known = await api().post("/api/v1/auth/reset-password-token").send({ email: "real.person@example.com" })
    const unknown = await api().post("/api/v1/auth/reset-password-token").send({ email: "nobody@example.com" })
    expect(known.body).toEqual(unknown.body)
  })
})
