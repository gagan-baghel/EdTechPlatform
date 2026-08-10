/**
 * One-shot backfill for content-model v2's `order` field. Run manually:
 *
 *   node scripts/backfill-content-order.js
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

const mongoose = require("mongoose")
const { connectDB } = require("../src/api/config/connectDB")

const Course = require("../src/api/models/Course")
const Section = require("../src/api/models/Section")

const log = (...args) => console.log("[backfill-content-order]", ...args)

async function main() {
  await connectDB()
  log("connected")

  const courses = await Course.find({}, { courseContent: 1 }).lean()
  let sectionsUpdated = 0

  for (const course of courses) {
    await Promise.all(
      (course.courseContent || []).map((sectionId, index) =>
        Section.updateOne({ _id: sectionId }, { order: index })
      )
    )
    sectionsUpdated += (course.courseContent || []).length
  }
  log(`sections: backfilled order on ${sectionsUpdated} section(s) across ${courses.length} course(s)`)

  const sections = await Section.find({}, { subSection: 1 }).lean()
  let subSectionsUpdated = 0
  const SubSection = require("../src/api/models/SubSection")

  for (const section of sections) {
    await Promise.all(
      (section.subSection || []).map((subSectionId, index) =>
        SubSection.updateOne({ _id: subSectionId }, { order: index })
      )
    )
    subSectionsUpdated += (section.subSection || []).length
  }
  log(`subsections: backfilled order on ${subSectionsUpdated} lecture(s) across ${sections.length} section(s)`)

  log("done")
  await mongoose.connection.close()
  process.exit(0)
}

main().catch((error) => {
  console.error("[backfill-content-order] FAILED:", error)
  process.exit(1)
})
