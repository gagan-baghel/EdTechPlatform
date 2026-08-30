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

/**
 * Authorization boundaries, proved rather than asserted.
 *
 * Every case here corresponds to a hole that was actually open: an instructor
 * mutating another instructor's lecture, any logged-in user granting
 * themselves free enrolment through an organisation, a student reading the Q&A
 * of a course they never bought. A 403 in these tests is the product working.
 */

let owner: TestUser
let attacker: TestUser
let student: TestUser
let outsider: TestUser
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
  owner = await createUser("Instructor")
  attacker = await createUser("Instructor")
  student = await createUser("Student")
  outsider = await createUser("Student")
  admin = await createUser("Admin")
  course = await createCourse(owner.id, { studentsEnrolled: [student.id] })
})

describe("lecture ownership", () => {
  it("stops one instructor deleting another's lecture", async () => {
    // The IDOR: ownership used to be checked against the CALLER's own section
    // id while the delete applied to whatever lecture id came with it.
    const victimLecture = course.subSectionIds[0]!
    const attackerCourse = await createCourse(attacker.id)

    // POST, not DELETE — `deleteSubSection` and `deleteSection` are POST
    // routes while `deleteCourse` is a DELETE. Inconsistent, but changing it
    // would break the shipped client, so the test matches reality.
    const res = await api()
      .post("/api/v1/course/deleteSubSection")
      .set(attacker.auth)
      .send({ subSectionId: victimLecture, sectionId: attackerCourse.sectionId })
    expect(res.status).toBe(403)

    const SubSection = (await import("../models/SubSection")).default
    expect(await SubSection.findById(victimLecture)).not.toBeNull()
  })

  it("stops one instructor editing another's lecture", async () => {
    const victimLecture = course.subSectionIds[0]!
    const res = await api()
      .post("/api/v1/course/updateSubSection")
      .set(attacker.auth)
      .send({ subSectionId: victimLecture, title: "Defaced" })
    expect(res.status).toBe(403)

    const SubSection = (await import("../models/SubSection")).default
    expect((await SubSection.findById(victimLecture))!.title).toBe("Lesson one")
  })

  it("lets the real owner through", async () => {
    const res = await api()
      .post("/api/v1/course/updateSubSection")
      .set(owner.auth)
      .send({ subSectionId: course.subSectionIds[0], title: "Renamed by the owner" })
    expect(res.status).toBe(200)
  })

  it("stops one instructor editing another's course", async () => {
    const res = await api()
      .post("/api/v1/course/editCourse")
      .set(attacker.auth)
      .send({ courseId: course.id, courseName: "Stolen" })
    expect(res.status).toBe(403)
  })

  it("stops one instructor deleting another's course", async () => {
    const res = await api().delete("/api/v1/course/deleteCourse").set(attacker.auth).send({ courseId: course.id })
    expect(res.status).toBe(403)

    const Course = (await import("../models/Course")).default
    expect(await Course.findById(course.id)).not.toBeNull()
  })

  it("rejects an attachment URL that is not on our media host", async () => {
    const res = await api()
      .post("/api/v1/course/addAttachment")
      .set(owner.auth)
      .send({
        subSectionId: course.subSectionIds[0],
        name: "invoice.pdf",
        url: "https://phishing.example.com/invoice.pdf",
        publicId: "x",
      })
    expect(res.status).toBe(400)
  })
})

describe("organisation seats", () => {
  it("refuses to let a student provision free enrolment for themselves", async () => {
    // The bypass: any logged-in user could create an org listing any paid
    // course, then join their own invite code and be enrolled for nothing.
    const res = await api()
      .post("/api/v1/organizations")
      .set(student.auth)
      .send({ name: "Free stuff", courses: [{ courseId: course.id, seatsTotal: 999 }] })
    expect(res.status).toBe(403)

    const Organization = (await import("../models/Organization")).default
    expect(await Organization.countDocuments({})).toBe(0)
  })

  it("refuses an instructor too", async () => {
    const res = await api()
      .post("/api/v1/organizations")
      .set(owner.auth)
      .send({ name: "Also free", courses: [{ courseId: course.id, seatsTotal: 5 }] })
    expect(res.status).toBe(403)
  })

  it("lets an admin provision seats, and a member consume exactly one", async () => {
    const created = await api()
      .post("/api/v1/organizations")
      .set(admin.auth)
      .send({ name: "Acme Corp", courses: [{ courseId: course.id, seatsTotal: 1 }] })
    expect(created.status).toBe(201)
    const inviteCode = created.body.data.inviteCode as string

    const joined = await api().post("/api/v1/organizations/join").set(outsider.auth).send({ inviteCode })
    expect(joined.status).toBe(200)

    const Course = (await import("../models/Course")).default
    expect((await Course.findById(course.id))!.studentsEnrolled.map(String)).toContain(outsider.id)

    // The seat is gone: the next person gets nothing.
    const second = await createUser("Student")
    expect((await api().post("/api/v1/organizations/join").set(second.auth).send({ inviteCode })).status).toBe(409)
  })

  it("cannot be over-subscribed by two people redeeming the last seat at once", async () => {
    const created = await api()
      .post("/api/v1/organizations")
      .set(admin.auth)
      .send({ name: "Race Corp", courses: [{ courseId: course.id, seatsTotal: 1 }] })
    const inviteCode = created.body.data.inviteCode as string

    const a = await createUser("Student")
    const b = await createUser("Student")
    const results = await Promise.all([
      api().post("/api/v1/organizations/join").set(a.auth).send({ inviteCode }),
      api().post("/api/v1/organizations/join").set(b.auth).send({ inviteCode }),
    ])

    // Exactly one wins; the platform never gives away a seat nobody paid for.
    expect(results.filter((r) => r.status === 200)).toHaveLength(1)

    const Organization = (await import("../models/Organization")).default
    const org = await Organization.findOne({ inviteCode })
    expect(org!.courses[0]!.seatsUsed).toBe(1)
  })

  it("refuses to provision a course that is not published", async () => {
    const draft = await createCourse(owner.id, { status: "Draft" })
    const res = await api()
      .post("/api/v1/organizations")
      .set(admin.auth)
      .send({ name: "Too early", courses: [{ courseId: draft.id, seatsTotal: 5 }] })
    expect(res.status).toBe(400)
  })
})

describe("enrolment gates content", () => {
  it("hides paid lecture URLs from an unauthenticated visitor", async () => {
    const res = await api().post("/api/v1/course/getCourseDetails").send({ courseId: course.id })
    expect(res.status).toBe(200)

    const lectures = res.body.data.courseDetails.courseContent.flatMap(
      (s: { subSection: { freePreview: boolean; videoUrl: string }[] }) => s.subSection
    )
    const paid = lectures.filter((l: { freePreview: boolean }) => !l.freePreview)
    expect(paid.length).toBeGreaterThan(0)
    expect(paid.every((l: { videoUrl: string }) => l.videoUrl === "")).toBe(true)
    // A free preview is still watchable, which is the point of marking one.
    expect(lectures.some((l: { freePreview: boolean; videoUrl: string }) => l.freePreview && l.videoUrl)).toBe(true)
  })

  it("refuses full course content to someone who never enrolled", async () => {
    const res = await api().post("/api/v1/course/getFullCourseDetails").set(outsider.auth).send({ courseId: course.id })
    expect(res.status).toBe(403)
  })

  it("serves full content to an enrolled student", async () => {
    const res = await api().post("/api/v1/course/getFullCourseDetails").set(student.auth).send({ courseId: course.id })
    expect(res.status).toBe(200)
  })

  it("keeps lecture Q&A inside the course", async () => {
    const lecture = course.subSectionIds[0]!
    expect(
      (await api().post("/api/v1/qna").set(outsider.auth).send({
        courseId: course.id, subSectionId: lecture, text: "Can I read this?",
      })).status
    ).toBe(403)

    // Reading was the hole: any logged-in account could read any lecture's Q&A.
    expect((await api().get(`/api/v1/qna/lecture/${lecture}`).set(outsider.auth)).status).toBe(403)
    expect((await api().get(`/api/v1/qna/lecture/${lecture}`).set(student.auth)).status).toBe(200)
  })

  it("stops a non-enrolled student recording progress", async () => {
    const res = await api()
      .post("/api/v1/course/updateCourseProgress")
      .set(outsider.auth)
      .send({ courseId: course.id, subsectionId: course.subSectionIds[0] })
    expect(res.status).toBe(403)
  })
})

describe("role boundaries", () => {
  it("keeps the admin surface away from students and instructors", async () => {
    for (const user of [student, owner]) {
      expect((await api().get("/api/v1/admin/users").set(user.auth)).status).toBe(403)
      expect((await api().get("/api/v1/admin/analytics").set(user.auth)).status).toBe(403)
      expect((await api().get("/api/v1/admin/audit-log").set(user.auth)).status).toBe(403)
    }
    expect((await api().get("/api/v1/admin/users").set(admin.auth)).status).toBe(200)
  })

  it("stops a student creating a course", async () => {
    expect((await api().post("/api/v1/course/createCourse").set(student.auth).send({})).status).toBe(403)
  })

  it("never returns a password hash from the admin user list", async () => {
    const res = await api().get("/api/v1/admin/users").set(admin.auth)
    expect(res.status).toBe(200)
    for (const user of res.body.data) {
      expect(user.password).toBeUndefined()
      expect(user.token).toBeUndefined()
    }
  })

  it("ends a suspended user's existing sessions immediately", async () => {
    const victim = await createUser("Student")
    expect((await api().get("/api/v1/profile/getUserDetails").set(victim.auth)).status).toBe(200)

    await api().patch(`/api/v1/admin/users/${victim.id}/active`).set(admin.auth).send({ active: false })

    // `active` is only read at login, so without session revocation a
    // suspended user kept browsing for the rest of the token's lifetime.
    expect((await api().get("/api/v1/profile/getUserDetails").set(victim.auth)).status).toBe(401)
  })

  it("stops an admin suspending themselves", async () => {
    const res = await api().patch(`/api/v1/admin/users/${admin.id}/active`).set(admin.auth).send({ active: false })
    expect(res.status).toBe(400)
  })
})
