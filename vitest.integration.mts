import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url))

/**
 * Integration suite: real controllers, real Express, real MongoDB.
 *
 * Separate from the unit config because the two want opposite things — the
 * unit tests mock the data layer and must stay fast, while these need a live
 * database and run the whole request path. Kept apart so neither compromises.
 *
 * The three aliases below are the entire extent of the faking. Nothing in
 * `src/api` is stubbed; only the SDKs that would otherwise open a socket to a
 * third party are swapped for local doubles, which is what makes this suite
 * runnable with no API keys at all.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.itest.ts"],
    setupFiles: ["./vitest.integration.setup.ts"],
    // A live mongod plus real index builds is slower than a mocked unit test.
    testTimeout: 30000,
    hookTimeout: 60000,
    // One worker: the suite shares a single database, and parallel files
    // clearing collections underneath each other is a race, not a test.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      razorpay: resolve("./src/api/test/fakes/razorpay.ts"),
      cloudinary: resolve("./src/api/test/fakes/cloudinary.ts"),
      nodemailer: resolve("./src/api/test/fakes/nodemailer.ts"),
      "@": resolve("./src"),
    },
  },
})
