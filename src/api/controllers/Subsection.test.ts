import type { Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AuthedRequest } from "../lib/http"

const OWNER_ID = "507f1f77bcf86cd799439011"
const ATTACKER_ID = "507f1f77bcf86cd799439099"
const SECTION_ID = "507f1f77bcf86cd799439022"
const VICTIM_LECTURE_ID = "507f1f77bcf86cd799439033"

vi.mock("../config/env", () => ({
  getEnv: () => ({
    FOLDER_NAME: "TestFolder",
    CLOUDINARY_API_SECRET: "s",
    CLOUDINARY_API_KEY: "k",
    CLOUDINARY_CLOUD_NAME: "c",
  }),
}))

vi.mock("cloudinary", () => ({
  default: {
    v2: {
      utils: { api_sign_request: vi.fn(() => "sig") },
      api: { resource: vi.fn() },
      uploader: { destroy: vi.fn() },
    },
  },
}))

vi.mock("../models/Section", () => ({
  default: { findOne: vi.fn(), findById: vi.fn(), updateOne: vi.fn() },
}))
vi.mock("../models/Course", () => ({ default: { findOne: vi.fn() } }))
vi.mock("../models/SubSection", () => ({
  default: { findById: vi.fn(), findByIdAndDelete: vi.fn(), findByIdAndUpdate: vi.fn(), create: vi.fn() },
}))

const { deleteSubSection, updateSubSection, addAttachment } = await import("./Subsection")
const Section = (await import("../models/Section")).default
const Course = (await import("../models/Course")).default
const SubSection = (await import("../models/SubSection")).default

/** `Course.findOne(...).select(...)` — the mock has to be chainable like the query. */
const selectResolving = (value: unknown) => ({ select: vi.fn().mockResolvedValue(value) })

function makeRes() {
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))
  return { res: { status, json, headersSent: false } as unknown as Response, status, json }
}

const req = (body: Record<string, unknown>, userId = ATTACKER_ID) =>
  ({ user: { id: userId }, body }) as unknown as AuthedRequest

/**
 * The lecture belongs to a course somebody else owns.
 *
 * This is the exact shape of the IDOR that existed: ownership used to be
 * checked against a `sectionId` the CALLER supplied (their own section), while
 * the mutation was applied to whatever `subSectionId` came alongside it. So
 * any instructor could edit or permanently delete any other instructor's
 * lecture by guessing its id. The check now starts from the lecture.
 */
function lectureOwnedBySomeoneElse() {
  vi.mocked(Section.findOne).mockResolvedValue({ _id: SECTION_ID } as never)
  // No course matches {courseContent: section, instructor: attacker}.
  vi.mocked(Course.findOne).mockReturnValue(selectResolving(null) as never)
}

function lectureOwnedByCaller() {
  vi.mocked(Section.findOne).mockResolvedValue({ _id: SECTION_ID } as never)
  vi.mocked(Course.findOne).mockReturnValue(selectResolving({ _id: "course1" }) as never)
  vi.mocked(SubSection.findById).mockResolvedValue({
    _id: VICTIM_LECTURE_ID,
    videoPublicId: "TestFolder/vid",
    save: vi.fn(),
  } as never)
  vi.mocked(Section.findById).mockReturnValue({
    populate: vi.fn().mockResolvedValue({ _id: SECTION_ID, subSection: [] }),
  } as never)
}

describe("lecture ownership", () => {
  beforeEach(() => vi.clearAllMocks())

  it("refuses to delete a lecture the caller does not own", async () => {
    lectureOwnedBySomeoneElse()
    const { res, status } = makeRes()

    await deleteSubSection(req({ subSectionId: VICTIM_LECTURE_ID }), res)

    expect(status).toHaveBeenCalledWith(403)
    expect(SubSection.findByIdAndDelete).not.toHaveBeenCalled()
    expect(Section.updateOne).not.toHaveBeenCalled()
  })

  it("refuses to update a lecture the caller does not own", async () => {
    lectureOwnedBySomeoneElse()
    const { res, status } = makeRes()

    await updateSubSection(req({ subSectionId: VICTIM_LECTURE_ID, title: "hijacked" }), res)

    expect(status).toHaveBeenCalledWith(403)
    expect(SubSection.findByIdAndUpdate).not.toHaveBeenCalled()
  })

  it("refuses to attach a file to a lecture the caller does not own", async () => {
    lectureOwnedBySomeoneElse()
    const { res, status } = makeRes()

    await addAttachment(
      req({
        subSectionId: VICTIM_LECTURE_ID,
        name: "notes.pdf",
        url: "https://res.cloudinary.com/demo/notes.pdf",
        publicId: "demo/notes",
      }),
      res
    )

    expect(status).toHaveBeenCalledWith(403)
    expect(SubSection.findByIdAndUpdate).not.toHaveBeenCalled()
  })

  it("scopes the ownership query to the caller, not to a caller-supplied section", async () => {
    lectureOwnedBySomeoneElse()
    const { res } = makeRes()

    await deleteSubSection(req({ subSectionId: VICTIM_LECTURE_ID }), res)

    // Section is resolved FROM the lecture; the course lookup is then pinned
    // to the authenticated instructor.
    expect(Section.findOne).toHaveBeenCalledWith({ subSection: VICTIM_LECTURE_ID })
    expect(Course.findOne).toHaveBeenCalledWith({
      courseContent: SECTION_ID,
      instructor: ATTACKER_ID,
    })
  })

  it("allows the owner through", async () => {
    lectureOwnedByCaller()
    vi.mocked(SubSection.findByIdAndDelete).mockResolvedValue({} as never)
    const { res, status } = makeRes()

    await deleteSubSection(req({ subSectionId: VICTIM_LECTURE_ID }, OWNER_ID), res)

    expect(SubSection.findByIdAndDelete).toHaveBeenCalledWith(VICTIM_LECTURE_ID)
    expect(status).not.toHaveBeenCalledWith(403)
  })

  it("rejects an attachment URL that is not on our media host", async () => {
    lectureOwnedByCaller()
    const { res, status } = makeRes()

    await addAttachment(
      req(
        {
          subSectionId: VICTIM_LECTURE_ID,
          name: "invoice.pdf",
          url: "https://phishing.example.com/invoice.pdf",
          publicId: "x",
        },
        OWNER_ID
      ),
      res
    )

    // Students click these from inside a paid course, so an arbitrary URL is
    // a phishing page carrying the platform's credibility.
    expect(status).toHaveBeenCalledWith(400)
    expect(SubSection.findByIdAndUpdate).not.toHaveBeenCalled()
  })

  it("rejects a malformed lecture id without querying", async () => {
    const { res, status } = makeRes()

    await deleteSubSection(req({ subSectionId: { $ne: null } }), res)

    expect(status).toHaveBeenCalledWith(400)
    expect(Section.findOne).not.toHaveBeenCalled()
  })
})
