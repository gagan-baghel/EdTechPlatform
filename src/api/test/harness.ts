import crypto from "crypto"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import { MongoMemoryServer } from "mongodb-memory-server"
import request from "supertest"
import type { Express } from "express"

import type { AccountType } from "@/types/domain"

/**
 * Integration harness: a real MongoDB, the real Express app, real controllers.
 *
 * The unit tests mock the data layer, which is right for testing a decision in
 * isolation but proves nothing about whether a purchase actually enrols
 * anybody. These run the whole request path — routing, auth middleware, Zod
 * validation, controller, Mongoose write, response — against a genuine mongod,
 * so an index, a schema default or a missing `await` fails the test the way it
 * would fail a user. Only the three third-party SDKs are faked (see ./fakes),
 * because those are the only parts that cannot run without an account.
 */

let mongod: MongoMemoryServer | null = null
let app: Express | null = null

export async function startTestServer(): Promise<Express> {
  if (app) return app

  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_CONNECTION_URL = mongod.getUri("edtech-test")

  // Imported only after the URI is in place: getEnv() caches on first read.
  const { createApiApp } = await import("../app")
  const express = (await import("express")).default

  // Mounted exactly as pages/api/v1/[...path].ts mounts it, so a path that
  // works here works in production and vice versa. Testing the inner app
  // directly would silently drop the /api prefix and prove nothing about the
  // routes anyone actually calls.
  const root = express()
  root.use("/api", createApiApp())
  app = root

  // autoIndex is off in production for good reasons (see connectDB.ts), but a
  // test database has no legacy duplicates, and the unique/TTL indexes ARE the
  // behaviour under test for idempotency — so build them explicitly.
  await mongoose.connect(process.env.MONGODB_CONNECTION_URL)
  return app
}

export async function stopTestServer(): Promise<void> {
  await mongoose.disconnect()
  await mongod?.stop()
  mongod = null
  app = null
}

/** Builds every index declared on every registered model. */
export async function ensureIndexes(): Promise<void> {
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.createIndexes())
  )
}

/** Wipes documents but keeps indexes, so each test starts from empty. */
export async function clearDatabase(): Promise<void> {
  const collections = await mongoose.connection.db!.collections()
  await Promise.all(collections.map((c) => c.deleteMany({})))
}

export function api(): request.Agent {
  if (!app) throw new Error("startTestServer() must run first")
  return request.agent(app)
}

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

export interface TestUser {
  id: string
  email: string
  token: string
  accountType: AccountType
  auth: { Authorization: string }
}

/**
 * Creates a user directly plus a matching Session, and signs a real JWT.
 *
 * Deliberately not through the signup endpoint: signup is itself under test,
 * and every other test would then depend on it passing. The token is signed
 * with the same secret and claims the app uses, so the auth middleware treats
 * it exactly like a real one.
 */
export async function createUser(
  accountType: AccountType,
  overrides: Partial<{ firstName: string; lastName: string; email: string; active: boolean }> = {}
): Promise<TestUser> {
  const bcrypt = (await import("bcryptjs")).default
  const User = (await import("../models/User")).default
  const Profile = (await import("../models/Profile")).default
  const Session = (await import("../models/Session")).default

  const suffix = crypto.randomBytes(4).toString("hex")
  const email = overrides.email ?? `${accountType.toLowerCase()}.${suffix}@example.com`
  const profile = await Profile.create({ gender: null, dateOfBirth: null, about: "", contactNumber: null })

  const user = await User.create({
    firstName: overrides.firstName ?? "Test",
    lastName: overrides.lastName ?? accountType,
    email,
    password: await bcrypt.hash("correct-horse-battery-staple", 10),
    accountType,
    active: overrides.active ?? true,
    additionalDetails: profile._id,
    userImage: "https://api.dicebear.com/7.x/initials/svg?seed=Test",
  })

  const jti = crypto.randomBytes(16).toString("hex")
  await Session.create({ user: user._id, jti, userAgent: "integration", ip: "127.0.0.1" })

  const token = jwt.sign(
    { email, id: user._id, accountType, jti },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  )

  return {
    id: user._id.toString(),
    email,
    token,
    accountType,
    auth: { Authorization: `Bearer ${token}` },
  }
}

export interface TestCourse {
  id: string
  sectionId: string
  subSectionIds: string[]
  price: number
}

/** A published course with two lectures, owned by `instructorId`. */
export async function createCourse(
  instructorId: string,
  overrides: Partial<{ price: number; status: string; name: string; studentsEnrolled: string[] }> = {}
): Promise<TestCourse> {
  const Course = (await import("../models/Course")).default
  const Section = (await import("../models/Section")).default
  const SubSection = (await import("../models/SubSection")).default
  const Category = (await import("../models/Category")).default
  const User = (await import("../models/User")).default

  const category = await Category.create({ name: `Category ${crypto.randomBytes(3).toString("hex")}` })
  const subs = await SubSection.create([
    { title: "Lesson one", timeDuration: "300", description: "First", videoUrl: "https://res.cloudinary.com/demo/video/upload/a.mp4", order: 0, freePreview: true },
    { title: "Lesson two", timeDuration: "600", description: "Second", videoUrl: "https://res.cloudinary.com/demo/video/upload/b.mp4", order: 1, freePreview: false },
  ])
  const section = await Section.create({ sectionName: "Section one", subSection: subs.map((s) => s._id), order: 0 })

  const price = overrides.price ?? 1000
  const course = await Course.create({
    courseName: overrides.name ?? "Integration Course",
    courseDescription: "A course used by the integration suite.",
    instructor: instructorId,
    whatYouWillLearn: "Everything",
    courseContent: [section._id],
    price,
    thumbnail: "https://res.cloudinary.com/demo/image/upload/t.jpg",
    tag: ["test"],
    category: category._id,
    instructions: ["None"],
    status: overrides.status ?? "Published",
    studentsEnrolled: overrides.studentsEnrolled ?? [],
  })

  await User.updateOne({ _id: instructorId }, { $push: { courses: course._id } })

  // Enrolment is denormalised across BOTH Course.studentsEnrolled and
  // User.courses, and different parts of the app read different sides of it
  // (Q&A and quizzes read User.courses; the catalogue reads
  // Course.studentsEnrolled). A fixture that sets only one produces a user who
  // is enrolled according to half the app, so keep the two in step exactly as
  // `enrollStudents` does.
  for (const studentId of overrides.studentsEnrolled ?? []) {
    await User.updateOne({ _id: studentId }, { $addToSet: { courses: course._id } })
  }

  return {
    id: course._id.toString(),
    sectionId: section._id.toString(),
    subSectionIds: subs.map((s) => s._id.toString()),
    price,
  }
}

/** The signature Razorpay would send for a browser callback. */
export function razorpayOrderSignature(orderId: string, paymentId: string): string {
  return crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex")
}

/** The signature Razorpay would send on a webhook, over the exact body bytes. */
export function razorpayWebhookSignature(rawBody: string): string {
  return crypto.createHmac("sha256", process.env.WEBHOOK_SECRET!).update(rawBody).digest("hex")
}

/** A `payment.captured` webhook body for an order. */
export function capturedPaymentEvent(orderId: string, paymentId = "pay_integration_001") {
  return {
    event: "payment.captured",
    payload: { payment: { entity: { id: paymentId, order_id: orderId, amount: 100000 } } },
  }
}
