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

/**
 * Results, scorecards, dashboards and monitoring.
 *
 * Every number on these screens is derived from other collections, so the
 * questions worth asking are the database ones: does the class position come
 * out right, does the answer key stay hidden until it should, does an
 * instructor only ever see their own students.
 */

let instructor: TestUser
let otherInstructor: TestUser
let student: TestUser
let classmate: TestUser
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
  instructor = await createUser("Instructor")
  otherInstructor = await createUser("Instructor")
  student = await createUser("Student", { firstName: "Asha", lastName: "Rao" })
  classmate = await createUser("Student", { firstName: "Vikram", lastName: "Shah" })
  admin = await createUser("Admin")
  course = await createCourse(instructor.id, { studentsEnrolled: [student.id, classmate.id] })
})

async function publishQuiz(passingScorePercent = 50) {
  const created = await api().post("/api/v1/quiz").set(instructor.auth).send({
    courseId: course.id,
    title: "Final assessment",
    passingScorePercent,
    questions: [
      { questionText: "Two plus two?", options: ["3", "4", "5"], correctOptionIndex: 1, explanation: "Basic addition." },
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

const answer = (as: TestUser, quizId: string, picks: Array<[string, number]>) =>
  api()
    .post(`/api/v1/quiz/${quizId}/attempts`)
    .set(as.auth)
    .send({ answers: picks.map(([questionId, selectedOptionIndex]) => ({ questionId, selectedOptionIndex })) })

const complete = (as: TestUser, lecture: string) =>
  api().post("/api/v1/course/updateCourseProgress").set(as.auth).send({ courseId: course.id, subsectionId: lecture })

describe("scorecard", () => {
  it("grades the student and places them in their class", async () => {
    const { quizId, questionIds } = await publishQuiz()
    await complete(student, course.subSectionIds[0]!)
    await answer(student, quizId, [[questionIds[0]!, 1], [questionIds[1]!, 0]])

    for (const lecture of course.subSectionIds) await complete(classmate, lecture)
    await answer(classmate, quizId, [[questionIds[0]!, 1], [questionIds[1]!, 1]])

    const res = await api().get("/api/v1/workspace/scorecard").set(student.auth)
    expect(res.status).toBe(200)
    const [card] = res.body.data.courses

    expect(card.lectures).toEqual({ completed: 1, total: 2 })
    expect(card.quizzes[0]).toMatchObject({ bestScore: 50, attempts: 1, passed: true, scope: "course" })
    // Half of 50% progress plus half of a 50% quiz average.
    expect(card.score).toBe(50)
    expect(card.grade).toBe("D")
    expect(card.rank).toEqual({ position: 2, of: 2 })
    expect(card.leaderboard.map((e: { name: string }) => e.name)).toEqual(["Vikram S.", "You"])
    expect(res.body.data.summary).toMatchObject({ courses: 1, quizzesTaken: 1, quizzesPassed: 1 })
    expect(res.body.data.quizHistory).toHaveLength(1)
  })

  it("keeps a classmate who opted out off the leaderboard, but still in the class", async () => {
    for (const lecture of course.subSectionIds) await complete(classmate, lecture)
    await complete(student, course.subSectionIds[0]!)

    const optOut = await api().put("/api/v1/profile/preferences").set(classmate.auth).send({ showOnLeaderboard: false })
    expect(optOut.status).toBe(200)

    const res = await api().get("/api/v1/workspace/scorecard").set(student.auth)
    const [card] = res.body.data.courses
    expect(card.rank).toEqual({ position: 2, of: 2 })
    expect(card.leaderboard).toEqual([expect.objectContaining({ name: "You", isYou: true })])
  })

  it("is a student-only page", async () => {
    const res = await api().get("/api/v1/workspace/scorecard").set(instructor.auth)
    expect(res.status).toBe(403)
  })
})

describe("quiz result review", () => {
  it("withholds the answer key from a student still trying", async () => {
    const { quizId, questionIds } = await publishQuiz(80)
    const res = await answer(student, quizId, [[questionIds[0]!, 1], [questionIds[1]!, 0]])
    expect(res.body.data.passed).toBe(false)
    expect(res.body.data.review).toBeNull()

    const review = await api().get(`/api/v1/quiz/${quizId}/review`).set(student.auth)
    expect(review.status).toBe(403)
  })

  it("shows every answer, the key and the explanation once passed", async () => {
    const { quizId, questionIds } = await publishQuiz(50)
    const res = await answer(student, quizId, [[questionIds[0]!, 1], [questionIds[1]!, 0]])
    expect(res.body.data.review).toEqual([
      expect.objectContaining({ selectedOptionIndex: 1, correctOptionIndex: 1, correct: true, explanation: "Basic addition." }),
      expect.objectContaining({ selectedOptionIndex: 0, correctOptionIndex: 1, correct: false }),
    ])

    const review = await api().get(`/api/v1/quiz/${quizId}/review`).set(student.auth)
    expect(review.status).toBe(200)
    expect(review.body.data.review).toHaveLength(2)
  })

  it("unlocks the review after the last attempt, even without a pass", async () => {
    const { quizId, questionIds } = await publishQuiz(100)
    let last
    for (let i = 0; i < 10; i += 1) last = await answer(student, quizId, [[questionIds[0]!, 0]])
    expect(last!.body.data.passed).toBe(false)
    expect(last!.body.data.review).toHaveLength(2)
  })
})

describe("instructor dashboard", () => {
  it("reports courses, learners and the question the class keeps missing", async () => {
    const { quizId, questionIds } = await publishQuiz()
    await complete(student, course.subSectionIds[0]!)
    await answer(student, quizId, [[questionIds[0]!, 1], [questionIds[1]!, 0]])
    await answer(classmate, quizId, [[questionIds[0]!, 1], [questionIds[1]!, 0]])

    const res = await api().get("/api/v1/profile/instructorDashboard?days=7").set(instructor.auth)
    expect(res.status).toBe(200)
    const data = res.body.data

    expect(data.timeline).toHaveLength(7)
    expect(data.totals).toMatchObject({ courses: 1, students: 2, enrollments: 2 })
    expect(data.courses[0]).toMatchObject({ students: 2, averageQuizScore: 50 })
    expect(data.learners.total).toBe(2)
    expect(data.learners.rows.map((r: { name: string }) => r.name).sort()).toEqual(["Asha Rao", "Vikram Shah"])
    expect(data.quizzes[0]).toMatchObject({ attempts: 2, students: 2, passRate: 100 })
    expect(data.quizzes[0].hardestQuestions[0]).toMatchObject({ questionText: "Capital of France?", correctRate: 0 })
    // Both students' best was 50%: one bar, in the 50–59 bucket.
    expect(data.quizzes[0].scoreDistribution).toEqual([0, 0, 0, 0, 0, 2, 0, 0, 0, 0])
    // Lecture one finished by one of two enrolled, lecture two by nobody.
    expect(data.courses[0].lectureFunnel.map((l: { completedPercent: number }) => l.completedPercent)).toEqual([50, 0])
    expect(data.progressDistribution.map((b: { learners: number }) => b.learners)).toEqual([1, 0, 1, 0, 0, 0])
    expect(data.statusByCourse[0].counts).toMatchObject({ on_track: 1, not_started: 1 })
    expect(data.timeline.at(-1).lecturesCompleted).toBe(1)
    expect(data.studyHeatmap).toHaveLength(7)
    expect(data.studyHeatmap.every((row: number[]) => row.length === 24)).toBe(true)
  })

  it("buckets study time in the viewer's timezone, and ignores one it can't read", async () => {
    const ok = await api().get("/api/v1/profile/instructorDashboard?tz=Asia/Kolkata").set(instructor.auth)
    expect(ok.body.data.timezone).toBe("Asia/Kolkata")
    const bad = await api().get("/api/v1/profile/instructorDashboard?tz=Mars/Olympus").set(instructor.auth)
    expect(bad.status).toBe(200)
    expect(bad.body.data.timezone).toBe("UTC")
  })

  it("shows another instructor nothing of this course", async () => {
    const res = await api().get("/api/v1/profile/instructorDashboard").set(otherInstructor.auth)
    expect(res.status).toBe(200)
    expect(res.body.data.courses).toEqual([])
    expect(res.body.data.learners.total).toBe(0)
  })

  it("is closed to students", async () => {
    const res = await api().get("/api/v1/profile/instructorDashboard").set(student.auth)
    expect(res.status).toBe(403)
  })
})

describe("admin monitoring", () => {
  it("returns a zero-filled series for the requested range", async () => {
    const res = await api().get("/api/v1/admin/analytics?days=7").set(admin.auth)
    expect(res.status).toBe(200)
    expect(res.body.data.rangeDays).toBe(7)
    expect(res.body.data.growthByDay).toHaveLength(7)
    expect(res.body.data.revenueByDay).toHaveLength(7)
    // Users have no createdAt; signups come from the ObjectId timestamp.
    expect(res.body.data.growthByDay.at(-1).signups).toBe(5)
    expect(res.body.data.usersByRole).toMatchObject({ Student: 2, Instructor: 2, Admin: 1 })
  })

  it("falls back to 30 days for a range it doesn't offer", async () => {
    const res = await api().get("/api/v1/admin/analytics?days=9999").set(admin.auth)
    expect(res.body.data.growthByDay).toHaveLength(30)
  })

  it("reports latency and the work waiting on a human", async () => {
    const res = await api().get("/api/v1/admin/health").set(admin.auth)
    expect(res.status).toBe(200)
    expect(typeof res.body.databaseLatencyMs).toBe("number")
    expect(res.body.attention).toMatchObject({ failedTranscripts: 0, pendingPayouts: 0 })
    expect(res.body.checks.aiTutorConfigured).toBe(false)
  })
})

describe("student workspace", () => {
  it("resumes into the lecture last watched and counts the activity", async () => {
    const lecture = course.subSectionIds[1]!
    for (const position of [10, 20]) {
      await api().post("/api/v1/course/updateWatchPosition").set(student.auth).send({
        courseId: course.id, subsectionId: lecture, positionSeconds: position, durationSeconds: 600,
      })
    }

    const res = await api().get("/api/v1/workspace").set(student.auth)
    expect(res.status).toBe(200)
    const [item] = res.body.data.continueLearning
    expect(item.resume).toEqual({ sectionId: course.sectionId, subSectionId: lecture })
    expect(item.totalLectures).toBe(2)
    expect(res.body.data.streak).toBe(1)
    expect(res.body.data.activityByDay).toHaveLength(30)
    expect(res.body.data.weeklyGoal).toEqual({ goalMinutes: 0, minutesLast7Days: 0 })
  })

  it("rejects a weekly goal the ring can't draw", async () => {
    const res = await api().put("/api/v1/profile/preferences").set(student.auth).send({ weeklyGoalMinutes: -5 })
    expect(res.status).toBe(400)
  })
})

describe("public stats", () => {
  it("counts published courses and active people, with no sign-in", async () => {
    const res = await api().get("/api/v1/course/stats")
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ courses: 1, learners: 2, instructors: 2, certificates: 0 })
    expect(res.headers["cache-control"]).toContain("s-maxage")
  })
})

describe("AI support", () => {
  it("says it isn't configured rather than failing opaquely", async () => {
    const res = await api().post("/api/v1/ai/assistant").set(student.auth).send({
      messages: [{ role: "user", content: "How do I get a certificate?" }],
    })
    expect(res.status).toBe(503)
  })

  it("rejects an empty conversation", async () => {
    const res = await api().post("/api/v1/ai/assistant").set(instructor.auth).send({ messages: [] })
    expect(res.status).toBe(400)
  })

  it("only drafts a quiz from the instructor's own course", async () => {
    const foreign = await api().post("/api/v1/ai/copilot/quiz").set(otherInstructor.auth).send({ courseId: course.id })
    expect(foreign.status).toBe(404)

    const own = await api().post("/api/v1/ai/copilot/quiz").set(instructor.auth).send({ courseId: course.id })
    expect(own.status).toBe(503)
  })
})
