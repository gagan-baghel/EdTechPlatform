import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import {
  api,
  clearDatabase,
  createCourse,
  createUser,
  ensureIndexes,
  startTestServer,
  stopTestServer,
  type TestCourse,
  type TestUser,
} from "../test/harness"
import { resetMailFake } from "../test/fakes/nodemailer"
import { resetRazorpayFake, razorpayCalls } from "../test/fakes/razorpay"

/**
 * The teaching and learning flow: publish a course, watch it, be assessed,
 * earn a certificate, and be refunded.
 *
 * These are the paths where "the API returned 200" is least informative —
 * grading, completion and refunds all have to be right in the database, not
 * just in the response.
 */

let instructor: TestUser
let student: TestUser
let admin: TestUser
let course: TestCourse

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
  resetRazorpayFake()
  instructor = await createUser("Instructor")
  student = await createUser("Student")
  admin = await createUser("Admin")
  course = await createCourse(instructor.id, { studentsEnrolled: [student.id] })
})

describe("publishing", () => {
  it("refuses to publish a course with no lessons", async () => {
    const Course = (await import("../models/Course")).default
    const empty = await createCourse(instructor.id, { status: "Draft" })
    await Course.updateOne({ _id: empty.id }, { $set: { courseContent: [] } })

    const res = await api()
      .post("/api/v1/course/editCourse")
      .set(instructor.auth)
      .send({ courseId: empty.id, status: "Published" })

    expect(res.status).toBe(400)
    expect((await Course.findById(empty.id))!.status).toBe("Draft")
  })

  it("publishes a course that is actually ready", async () => {
    const draft = await createCourse(instructor.id, { status: "Draft" })
    const res = await api()
      .post("/api/v1/course/editCourse")
      .set(instructor.auth)
      .send({ courseId: draft.id, status: "Published" })

    expect(res.status).toBe(200)
    const Course = (await import("../models/Course")).default
    expect((await Course.findById(draft.id))!.status).toBe("Published")
  })

  it("keeps drafts out of the public catalogue", async () => {
    await createCourse(instructor.id, { status: "Draft", name: "Secret Draft" })
    const res = await api().get("/api/v1/course/getAllCourses")
    expect(res.status).toBe(200)
    const names = res.body.data.map((c: { courseName: string }) => c.courseName)
    expect(names).not.toContain("Secret Draft")
  })

  it("rejects a status outside the allowed set", async () => {
    const res = await api()
      .post("/api/v1/course/editCourse")
      .set(instructor.auth)
      .send({ courseId: course.id, status: "Published " })
    expect(res.status).toBe(400)
  })

  it("bounds the public catalogue rather than returning everything", async () => {
    const res = await api().get("/api/v1/course/getAllCourses?limit=500")
    expect(res.status).toBe(200)
    // The cap is enforced server-side; a caller cannot ask for the collection.
    expect(res.body.limit).toBeLessThanOrEqual(60)
  })
})

describe("progress", () => {
  const markComplete = (lecture: string, as: TestUser = student) =>
    api().post("/api/v1/course/updateCourseProgress").set(as.auth).send({
      courseId: course.id,
      subsectionId: lecture,
    })

  it("records a completed lecture", async () => {
    expect((await markComplete(course.subSectionIds[0]!)).status).toBe(200)

    const CourseProgress = (await import("../models/CourseProgress")).default
    const progress = await CourseProgress.findOne({ courseID: course.id, userId: student.id })
    expect(progress!.completedVideos.map(String)).toEqual([course.subSectionIds[0]])
  })

  it("never records the same lecture twice, even from concurrent tabs", async () => {
    const lecture = course.subSectionIds[0]!
    await Promise.all([markComplete(lecture), markComplete(lecture), markComplete(lecture)])

    const CourseProgress = (await import("../models/CourseProgress")).default
    const progress = await CourseProgress.findOne({ courseID: course.id, userId: student.id })
    // Check-then-act used to let two tabs both push, pushing progress over 100%.
    expect(progress!.completedVideos.map(String)).toEqual([lecture])
  })

  it("reports a percentage rather than an error before anything is watched", async () => {
    const res = await api()
      .post("/api/v1/course/getProgressPercentage")
      .set(student.auth)
      .send({ courseId: course.id })
    expect(res.status).toBe(200)
    expect(res.body.data).toBe(0)
  })

  it("auto-completes a lecture watched past the threshold", async () => {
    const lecture = course.subSectionIds[0]!
    const res = await api().post("/api/v1/course/updateWatchPosition").set(student.auth).send({
      courseId: course.id, subsectionId: lecture, positionSeconds: 290, durationSeconds: 300,
    })
    expect(res.status).toBe(200)
    expect(res.body.autoCompleted).toBe(true)
  })

  it("does not auto-complete a lecture barely started", async () => {
    const res = await api().post("/api/v1/course/updateWatchPosition").set(student.auth).send({
      courseId: course.id, subsectionId: course.subSectionIds[0], positionSeconds: 5, durationSeconds: 300,
    })
    expect(res.body.autoCompleted).toBe(false)
  })
})

describe("quizzes and certificates", () => {
  async function publishQuiz(passingScorePercent = 50) {
    const created = await api().post("/api/v1/quiz").set(instructor.auth).send({
      courseId: course.id,
      title: "Final assessment",
      passingScorePercent,
      questions: [
        { questionText: "Two plus two?", options: ["3", "4", "5"], correctOptionIndex: 1 },
        { questionText: "Capital of France?", options: ["Rome", "Paris"], correctOptionIndex: 1 },
      ],
    })
    const quizId = created.body.data._id as string
    await api().patch(`/api/v1/quiz/${quizId}`).set(instructor.auth).send({ published: true })
    const Quiz = (await import("../models/Quiz")).default
    const quiz = await Quiz.findById(quizId)
    return {
      quizId,
      questionIds: quiz!.questions.map((q: { _id: { toString(): string } }) => q._id.toString()),
    }
  }

  it("never sends the answer key to a student", async () => {
    const { quizId } = await publishQuiz()
    const res = await api().get(`/api/v1/quiz/${quizId}`).set(student.auth)
    expect(res.status).toBe(200)
    for (const question of res.body.data.questions) {
      expect(question.correctOptionIndex).toBeUndefined()
    }
  })

  it("grades against the stored key, not the submission", async () => {
    const { quizId, questionIds } = await publishQuiz()
    const res = await api().post(`/api/v1/quiz/${quizId}/attempts`).set(student.auth).send({
      answers: [
        { questionId: questionIds[0], selectedOptionIndex: 1 },
        { questionId: questionIds[1], selectedOptionIndex: 0 },
      ],
      // A client claiming it passed must be ignored.
      scorePercent: 100,
      passed: true,
    })
    expect(res.status).toBe(200)
    expect(res.body.data.scorePercent).toBe(50)
    expect(res.body.data.passed).toBe(true)
  })

  it("fails a student below the passing score", async () => {
    const { quizId, questionIds } = await publishQuiz(80)
    const res = await api().post(`/api/v1/quiz/${quizId}/attempts`).set(student.auth).send({
      answers: [
        { questionId: questionIds[0], selectedOptionIndex: 0 },
        { questionId: questionIds[1], selectedOptionIndex: 0 },
      ],
    })
    expect(res.body.data.scorePercent).toBe(0)
    expect(res.body.data.passed).toBe(false)
  })

  it("caps attempts, so a quiz cannot be brute-forced", async () => {
    const { quizId, questionIds } = await publishQuiz()
    const attempt = () =>
      api().post(`/api/v1/quiz/${quizId}/attempts`).set(student.auth).send({
        answers: [{ questionId: questionIds[0], selectedOptionIndex: 0 }],
      })

    for (let i = 0; i < 10; i += 1) expect((await attempt()).status).toBe(200)
    // Every submission reveals the score, so unlimited attempts reveal the key.
    expect((await attempt()).status).toBe(429)
  })

  it("keeps an unpublished quiz away from students", async () => {
    const created = await api().post("/api/v1/quiz").set(instructor.auth).send({
      courseId: course.id, title: "Draft quiz",
      questions: [{ questionText: "?", options: ["a", "b"], correctOptionIndex: 0 }],
    })
    const res = await api().get(`/api/v1/quiz/${created.body.data._id}`).set(student.auth)
    expect(res.status).toBe(404)
  })

  it("issues a certificate once every lecture is done and every quiz passed", async () => {
    const { quizId, questionIds } = await publishQuiz()
    await api().post(`/api/v1/quiz/${quizId}/attempts`).set(student.auth).send({
      answers: [
        { questionId: questionIds[0], selectedOptionIndex: 1 },
        { questionId: questionIds[1], selectedOptionIndex: 1 },
      ],
    })

    for (const lecture of course.subSectionIds) {
      await api().post("/api/v1/course/updateCourseProgress").set(student.auth)
        .send({ courseId: course.id, subsectionId: lecture })
    }

    const Certificate = (await import("../models/Certificate")).default
    const certificate = await Certificate.findOne({ user: student.id, course: course.id })
    expect(certificate).not.toBeNull()

    // A certificate exists to be checked by someone with no account.
    const verified = await api().get(`/api/v1/certificate/verify/${certificate!.certificateNumber}`)
    expect(verified.status).toBe(200)
    expect(verified.body.data.studentName).toContain("Test")
  })

  it("withholds the certificate while a course quiz is unpassed", async () => {
    const { quizId, questionIds } = await publishQuiz(80)
    await api().post(`/api/v1/quiz/${quizId}/attempts`).set(student.auth).send({
      answers: [{ questionId: questionIds[0], selectedOptionIndex: 0 }],
    })

    for (const lecture of course.subSectionIds) {
      await api().post("/api/v1/course/updateCourseProgress").set(student.auth)
        .send({ courseId: course.id, subsectionId: lecture })
    }

    const Certificate = (await import("../models/Certificate")).default
    expect(await Certificate.findOne({ user: student.id, course: course.id })).toBeNull()
  })

  it("does not issue two certificates for one course", async () => {
    const Certificate = (await import("../models/Certificate")).default
    for (const lecture of course.subSectionIds) {
      await api().post("/api/v1/course/updateCourseProgress").set(student.auth)
        .send({ courseId: course.id, subsectionId: lecture })
    }
    // Repeated heartbeats re-run issuance; the unique index is the guarantee.
    await api().post("/api/v1/course/updateWatchPosition").set(student.auth).send({
      courseId: course.id, subsectionId: course.subSectionIds[0], positionSeconds: 299, durationSeconds: 300,
    })
    expect(await Certificate.countDocuments({ user: student.id, course: course.id })).toBe(1)
  })
})

describe("refunds", () => {
  /**
   * Buys a course the student does not already own and returns its Payment id.
   * The shared fixture enrols them in `course`, and checkout correctly refuses
   * to sell something you already have — so a refund test needs its own.
   */
  async function buyCourse() {
    const purchasable = await createCourse(instructor.id, { name: "Refundable Course", price: 500 })
    const order = await api().post("/api/v1/payment/capturePayment").set(student.auth).send({ courses: [purchasable.id] })
    const orderId = order.body.message.id as string
    const { razorpayOrderSignature } = await import("../test/harness")
    await api().post("/api/v1/payment/verifyPayment").set(student.auth).send({
      razorpay_order_id: orderId,
      razorpay_payment_id: "pay_refund_001",
      razorpay_signature: razorpayOrderSignature(orderId, "pay_refund_001"),
    })
    await api().post("/api/v1/payment/createPaymentEntry").set(student.auth)
      .send({ orderId, paymentId: "pay_refund_001" })

    const Payment = (await import("../models/Payment")).default
    return {
      paymentId: (await Payment.findOne({ orderId }))!._id.toString(),
      courseId: purchasable.id,
    }
  }

  it("reverses access and marks the order refunded", async () => {
    const { paymentId, courseId } = await buyCourse()

    const Course = (await import("../models/Course")).default
    expect((await Course.findById(courseId))!.studentsEnrolled.map(String)).toContain(student.id)

    const res = await api().post("/api/v1/admin/refunds").set(admin.auth)
      .send({ paymentId, reason: "requested_by_customer" })
    expect(res.status).toBe(200)

    const Order = (await import("../models/Order")).default
    const Payment = (await import("../models/Payment")).default

    const payment = await Payment.findById(paymentId)
    expect((await Order.findOne({ orderId: payment!.orderId }))!.status).toBe("refunded")
    // Access is actually withdrawn, on both sides of the denormalised enrolment.
    expect((await Course.findById(courseId))!.studentsEnrolled.map(String)).not.toContain(student.id)

    const User = (await import("../models/User")).default
    expect((await User.findById(student.id))!.courses.map(String)).not.toContain(courseId)
  })

  it("refunds a payment once, even when two admins click at the same time", async () => {
    const { paymentId } = await buyCourse()

    const results = await Promise.all([
      api().post("/api/v1/admin/refunds").set(admin.auth).send({ paymentId, reason: "admin_discretion" }),
      api().post("/api/v1/admin/refunds").set(admin.auth).send({ paymentId, reason: "admin_discretion" }),
    ])

    // The platform must not pay out twice for one purchase.
    expect(results.filter((r) => r.status === 200)).toHaveLength(1)
    expect(razorpayCalls.filter((c) => c.method === "payments.refund")).toHaveLength(1)
  })

  it("refuses a second refund on an already-refunded order", async () => {
    const { paymentId } = await buyCourse()
    await api().post("/api/v1/admin/refunds").set(admin.auth).send({ paymentId, reason: "admin_discretion" })
    const again = await api().post("/api/v1/admin/refunds").set(admin.auth).send({ paymentId, reason: "admin_discretion" })
    expect(again.status).toBe(409)
  })

  it("is admin-only", async () => {
    const { paymentId } = await buyCourse()
    for (const user of [student, instructor]) {
      expect((await api().post("/api/v1/admin/refunds").set(user.auth)
        .send({ paymentId, reason: "admin_discretion" })).status).toBe(403)
    }
  })
})
