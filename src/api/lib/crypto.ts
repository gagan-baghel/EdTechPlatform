import crypto from "crypto"
import { getEnv } from "../config/env"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const SALT_LENGTH = 64
const KEY_LENGTH = 32
const PBKDF2_ITERATIONS = 100_000

/**
 * Field-level encryption for the small number of columns that hold real
 * financial identity (instructor bank details).
 *
 * Two things here are deliberate and were previously wrong:
 *
 *  1. There is NO fallback key. The previous version fell back to a literal
 *     "0000…" when FIELD_ENCRYPTION_KEY was unset, which meant a production
 *     deployment that forgot the variable stored bank account numbers under a
 *     key published in this repository — strictly worse than plaintext,
 *     because the masking in Payout.ts made it *look* protected. Missing key
 *     now throws, so the failure is a loud 500 on one endpoint instead of a
 *     silent, permanent data exposure.
 *
 *  2. Ciphertext carries an explicit `enc:v1` prefix. The old
 *     "does it have four colon-separated parts?" heuristic could not tell a
 *     plaintext value containing colons from ciphertext, so it would skip
 *     encrypting it and hand it back verbatim on read.
 */

const PREFIX = "enc:v1"

function encryptionKey(): string {
  const key = getEnv().FIELD_ENCRYPTION_KEY
  if (!key) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY is not configured; refusing to store sensitive fields unencrypted"
    )
  }
  return key
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(`${PREFIX}:`)
}

/** `enc:v1:hex(iv):hex(salt):hex(tag):hex(ciphertext)` */
export function encrypt(text: string): string {
  if (!text) return text
  if (isEncrypted(text)) return text

  const iv = crypto.randomBytes(IV_LENGTH)
  const salt = crypto.randomBytes(SALT_LENGTH)
  const key = crypto.pbkdf2Sync(encryptionKey(), salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha512")

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    PREFIX,
    iv.toString("hex"),
    salt.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":")
}

/**
 * Returns the plaintext, or throws.
 *
 * It does not fall back to returning the ciphertext: a caller that gets a
 * value back has to be able to trust it is the real one, otherwise a rotated
 * key turns into an account number that renders as hex and is masked as if it
 * were real. Values written before this module existed have no prefix and are
 * returned unchanged, which is what makes the rollout non-breaking.
 */
export function decrypt(text: string): string {
  if (!text || !isEncrypted(text)) return text

  // ["enc", "v1", iv, salt, tag, payload] — the prefix is TWO segments, so
  // the parts start at index 2.
  const parts = text.split(":")
  const [, , ivHex, saltHex, tagHex, payloadHex] = parts
  if (parts.length !== 6 || !ivHex || !saltHex || !tagHex || !payloadHex) {
    throw new Error("Encrypted field is malformed")
  }

  const key = crypto.pbkdf2Sync(
    encryptionKey(),
    Buffer.from(saltHex, "hex"),
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    "sha512"
  )
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"))
  decipher.setAuthTag(Buffer.from(tagHex, "hex"))

  return Buffer.concat([
    decipher.update(Buffer.from(payloadHex, "hex")),
    decipher.final(),
  ]).toString("utf8")
}

/**
 * One-way hash for values we only ever need to *look up*, never read back —
 * password-reset tokens. Storing the raw token means anyone with read access
 * to the users collection can complete a reset for any account with one
 * outstanding. SHA-256 without a salt is correct here (unlike for passwords):
 * the input is already 256 bits of CSPRNG output, so there is nothing to
 * brute-force and a per-value salt would break lookup by hash.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}
