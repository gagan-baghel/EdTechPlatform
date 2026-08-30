/**
 * Test environment.
 *
 * `getEnv()` validates the whole server config on first access and throws when
 * anything required is missing, so any test that transitively touches it needs
 * these present. They are set unconditionally rather than falling back to the
 * developer's `.env.local`: a suite whose result depends on which machine it
 * runs on is not a suite you can act on.
 *
 * These are obviously fake values. Nothing here reaches a real service — the
 * tests that use them exercise pure logic (HMAC verification, field
 * encryption) or mocked data access.
 */
// NODE_ENV is typed read-only by @types/node, and vitest already sets it to
// "test" — asserted here rather than assigned so a wrong value is caught
// instead of silently ignored.
if (process.env.NODE_ENV !== "test") {
  throw new Error(`Expected NODE_ENV=test in the test suite, got ${process.env.NODE_ENV}`)
}
process.env.MONGODB_CONNECTION_URL = "mongodb://127.0.0.1:27017/edtech-test"
process.env.JWT_SECRET = "test-jwt-secret-that-is-long-enough-to-not-warn"
process.env.RAZORPAY_SECRET = "test_secret_key"
process.env.WEBHOOK_SECRET = "test_webhook_secret"
process.env.FIELD_ENCRYPTION_KEY = "test-field-encryption-key-32-chars!!"
process.env.APP_BASE_URL = "https://test.example.com"
process.env.CRON_SECRET = "test-cron-secret"
