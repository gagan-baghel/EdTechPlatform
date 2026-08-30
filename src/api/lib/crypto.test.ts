import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

import { decrypt, encrypt, hashToken, isEncrypted } from "./crypto"

const withKey = (key: string | undefined) => {
  if (key === undefined) delete process.env.FIELD_ENCRYPTION_KEY
  else process.env.FIELD_ENCRYPTION_KEY = key
}

// getEnv() caches on first call, so each test gets a fresh module graph.
async function freshCrypto() {
  vi.resetModules()
  return import("./crypto")
}

describe("field encryption", () => {
  const original = process.env.FIELD_ENCRYPTION_KEY

  beforeEach(() => {
    withKey("a-test-key-that-is-at-least-32-chars-long")
  })

  afterEach(() => {
    withKey(original)
    vi.resetModules()
  })

  it("round-trips a value", async () => {
    const { encrypt: enc, decrypt: dec } = await freshCrypto()
    const plaintext = "50100123456789"
    expect(dec(enc(plaintext))).toBe(plaintext)
  })

  it("produces different ciphertext each time for the same input", async () => {
    // Random IV + salt per call. Identical ciphertext would let anyone with
    // read access tell which instructors share a bank account number.
    const { encrypt: enc } = await freshCrypto()
    expect(enc("same")).not.toBe(enc("same"))
  })

  it("does not double-encrypt an already-encrypted value", async () => {
    const { encrypt: enc, decrypt: dec } = await freshCrypto()
    const once = enc("12345")
    expect(enc(once)).toBe(once)
    expect(dec(once)).toBe("12345")
  })

  it("encrypts a plaintext value that contains colons", async () => {
    // The previous "four colon-separated parts means it's ciphertext"
    // heuristic silently stored such a value unencrypted.
    const { encrypt: enc, decrypt: dec } = await freshCrypto()
    const tricky = "a:b:c:d"
    const ciphertext = enc(tricky)
    expect(ciphertext).not.toBe(tricky)
    expect(dec(ciphertext)).toBe(tricky)
  })

  it("passes through legacy plaintext on read", async () => {
    // Rows written before this module existed carry no prefix and must keep
    // reading correctly rather than throwing.
    const { decrypt: dec } = await freshCrypto()
    expect(dec("plain-legacy-value")).toBe("plain-legacy-value")
  })

  it("leaves empty values alone", () => {
    expect(encrypt("")).toBe("")
    expect(decrypt("")).toBe("")
  })

  it("refuses to encrypt when no key is configured", async () => {
    withKey("")
    const { encrypt: enc } = await freshCrypto()
    // Fails loudly instead of falling back to a key committed to this repo.
    expect(() => enc("12345")).toThrow(/FIELD_ENCRYPTION_KEY/)
  })

  it("cannot decrypt with the wrong key", async () => {
    const { encrypt: enc } = await freshCrypto()
    const ciphertext = enc("secret-account")

    withKey("a-DIFFERENT-key-that-is-also-32-chars")
    const { decrypt: dec } = await freshCrypto()
    // GCM auth tag mismatch. It must throw, never return the ciphertext as
    // though it were the plaintext.
    expect(() => dec(ciphertext)).toThrow()
  })

  it("recognises its own format", async () => {
    const { encrypt: enc } = await freshCrypto()
    expect(isEncrypted(enc("x"))).toBe(true)
    expect(isEncrypted("x")).toBe(false)
  })
})

describe("hashToken", () => {
  it("is deterministic, so a reset token can be looked up by hash", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"))
  })

  it("does not reveal the token", () => {
    const token = "a".repeat(64)
    expect(hashToken(token)).not.toContain(token)
    expect(hashToken(token)).toHaveLength(64)
  })

  it("separates distinct tokens", () => {
    expect(hashToken("abc")).not.toBe(hashToken("abd"))
  })
})
