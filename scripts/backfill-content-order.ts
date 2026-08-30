/**
 * One-shot backfill for content-model v2's `order` field. Run manually:
 *
 *   npx tsx scripts/backfill-content-order.ts
 *
 * Every Section/SubSection created before this field existed defaults to
 * order: 0 (the schema default), so every populate that now sorts by
 * `order` (see Course.js, Section.js, Subsection.js, Profile.js) would
 * return them all tied at 0 for existing courses — order then falls back
 * to whatever the query planner happens to return, not the original
 * array-position order authors actually built. This backfills `order`
 * from each course/section's EXISTING array position, so nothing visibly
 * reorders for existing content; only content created after this ships
 * gets `order` set at creation time (see Section.js createSection,
 * Subsection.js createSubSection).
 *
 * Idempotent — recomputes from current array order every run, which is a
 * no-op once this has run once, since nothing else mutates array order
 * (the reorder endpoints write `order` directly, not the array).
 */

import mongoose from "mongoose"
import { connectDB } from "../src/api/config/connectDB"
import Course from "../src/api/models/Course"
import Section from "../src/api/models/Section"
import SubSection from "../src/api/models/SubSection"

const log = (...args: unknown[]): void => console.log("[backfill-content-order]", ...args)

async function main(): Promise<void> {
  await connectDB()
  log("connected")

  const courses = await Course
    .find({}, { courseContent: 1 })
    .lean()

  let sectionsUpdated = 0

  for (const course of courses) {
    await Promise.all(
      (course.courseContent ?? []).map((sectionId: mongoose.Types.ObjectId, index: number) =>
        Section.updateOne({ _id: sectionId }, { order: index })
      )
    )
    sectionsUpdated += (course.courseContent ?? []).length
  }
  log(`sections: backfilled order on ${sectionsUpdated} section(s) across ${courses.length} course(s)`)

  const sections = await Section
    .find({}, { subSection: 1 })
    .lean()

  let subSectionsUpdated = 0

  for (const section of sections) {
    await Promise.all(
      (section.subSection ?? []).map((subSectionId: mongoose.Types.ObjectId, index: number) =>
        SubSection.updateOne({ _id: subSectionId }, { order: index })
      )
    )
    subSectionsUpdated += (section.subSection ?? []).length
  }
  log(`subsections: backfilled order on ${subSectionsUpdated} lecture(s) across ${sections.length} section(s)`)

  log("done")
  await mongoose.connection.close()
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error("[backfill-content-order] FAILED:", error)
  process.exit(1)
})
