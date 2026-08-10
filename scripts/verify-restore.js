/**
 * Restore verification — run this against a SCRATCH database after a
 * restore, never against production. See docs/BACKUP_RESTORE.md section 3
 * for the full procedure this belongs to.
 *
 *   MONGODB_CONNECTION_URL="mongodb://localhost:27018/restore-test" node scripts/verify-restore.js
 *
 * A restore that "completes without error" is not the same as a restore
 * that produced usable data — this checks for the specific ways a restore
 * can silently fail: a truncated collection, indexes that didn't rebuild,
 * or a money-critical collection whose cross-references don't line up.
 *
 * Exits 0 if every check passes, 1 otherwise — safe to wire into a CI job
 * or a scheduled drill, not just run by hand.
 */

const mongoose = require("mongoose")

// Deliberately does NOT import connectDB.js — that module is wired for
// the app's normal MONGODB_CONNECTION_URL and autoIndex:false, and this
// script explicitly wants a plain, direct connection to whatever URL is
// passed in, since it's meant to point at a scratch DB, not the app's
// configured target.
async function connect() {
  const uri = process.env.MONGODB_CONNECTION_URL
  if (!uri) {
    throw new Error("Set MONGODB_CONNECTION_URL to the scratch database's connection string")
  }
  // Refuse to run against anything that looks like the real Atlas
  // production cluster by accident — this script's whole job is asserting
  // things about a copy, and running it against the original is a
  // guaranteed-safe no-op at best, so it's more likely a mistake to catch
  // than a case to support.
  if (!/restore|scratch|test|localhost|127\.0\.0\.1/i.test(uri)) {
    throw new Error(
      "Refusing to run: MONGODB_CONNECTION_URL doesn't look like a scratch/restore-test database. " +
        "Rename the restore target to include 'restore' or 'test', or point at localhost."
    )
  }

  await mongoose.connect(uri)
}

const EXPECTED_COLLECTIONS = [
  "users",
  "courses",
  "sections",
  "subsections",
  "categories",
  "orders",
  "payments",
  "courseprogresses",
  "ratingandreviews",
]

const EXPECTED_UNIQUE_INDEXES = [
  { collection: "users", keys: ["email"] },
  { collection: "payments", keys: ["orderId", "consumer"] },
  { collection: "courseprogresses", keys: ["courseID", "userId"] },
  { collection: "ratingandreviews", keys: ["user", "course"] },
  { collection: "orders", keys: ["orderId"] },
]

let failures = 0
const fail = (message) => {
  failures += 1
  console.error(`[FAIL] ${message}`)
}
const pass = (message) => console.log(`[OK]   ${message}`)

async function checkCollectionsExist() {
  const db = mongoose.connection.db
  const collections = (await db.listCollections().toArray()).map((c) => c.name)

  for (const name of EXPECTED_COLLECTIONS) {
    if (!collections.includes(name)) {
      fail(`Collection "${name}" is missing entirely — restore did not bring it over`)
      continue
    }
    const count = await db.collection(name).countDocuments()
    if (count === 0) {
      // Empty is not automatically wrong (a fresh/small platform may
      // legitimately have zero rows in some collections), but it's worth
      // a visible warning rather than silent success, since it's exactly
      // what a truncated restore looks like too.
      console.warn(`[WARN] Collection "${name}" exists but has 0 documents — expected for a new platform, suspicious for a restore of a live one`)
    } else {
      pass(`Collection "${name}" has ${count} document(s)`)
    }
  }
}

async function checkIndexes() {
  const db = mongoose.connection.db

  for (const { collection, keys } of EXPECTED_UNIQUE_INDEXES) {
    const indexes = await db.collection(collection).indexes()
    const found = indexes.find((idx) => {
      const idxKeys = Object.keys(idx.key)
      return idx.unique && keys.every((k) => idxKeys.includes(k)) && idxKeys.length === keys.length
    })

    if (found) {
      pass(`Unique index on ${collection}.{${keys.join(",")}} present`)
    } else {
      fail(
        `Unique index on ${collection}.{${keys.join(",")}} is missing — ` +
          `run scripts/ensure-indexes.js against this restored database before trusting it`
      )
    }
  }
}

/**
 * The money-critical spot check: every Payment should reference an Order
 * that actually exists, and the amounts should be internally consistent
 * (Payment.amount in rupees should roughly match Order.amount in paise).
 * This is what catches silent corruption that "the collection has rows"
 * alone would miss.
 */
async function checkPaymentOrderIntegrity() {
  const db = mongoose.connection.db
  const payments = await db.collection("payments").find({}).limit(50).toArray()

  if (payments.length === 0) {
    console.warn("[WARN] No payments to cross-check — skipping integrity check")
    return
  }

  let orphaned = 0
  let mismatched = 0

  for (const payment of payments) {
    const order = await db.collection("orders").findOne({ orderId: payment.orderId })
    if (!order) {
      orphaned += 1
      continue
    }
    const expectedRupees = order.amount / 100
    if (Math.abs(expectedRupees - payment.amount) > 0.01) {
      mismatched += 1
    }
  }

  if (orphaned > 0) {
    fail(`${orphaned} of ${payments.length} sampled payments reference an Order that doesn't exist in this restore`)
  } else {
    pass(`All ${payments.length} sampled payments have a matching Order`)
  }

  if (mismatched > 0) {
    fail(`${mismatched} of ${payments.length} sampled payments have an amount that doesn't match their Order`)
  } else {
    pass(`Payment/Order amounts are consistent across the sample`)
  }
}

async function main() {
  await connect()
  console.log(`[verify-restore] connected to ${mongoose.connection.name}`)

  await checkCollectionsExist()
  await checkIndexes()
  await checkPaymentOrderIntegrity()

  await mongoose.connection.close()

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed — this restore is not trustworthy as-is.`)
    process.exit(1)
  }

  console.log("\nAll checks passed.")
  process.exit(0)
}

main().catch((error) => {
  console.error("[verify-restore] FAILED:", error.message)
  process.exit(1)
})
