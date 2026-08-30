import { z } from "zod"
import type { Types } from "mongoose"
import type { Request, Response } from "express"
import cloudinaryModule from "cloudinary"

import { containsId } from "../lib/ids"
import { getEnv } from "../config/env"
import { fail, parseOrThrow } from "../lib/respond"
import { httpsUrl, objectId, text } from "../lib/schemas"
import type { AuthedRequest } from "../lib/http"
import SubSection from "../models/SubSection"
import Section from "../models/Section"
import Course from "../models/Course"

const cloudinary = cloudinaryModule.v2

/** Only our own media host may be referenced from course content. */
const CLOUDINARY_HOSTS = ["res.cloudinary.com"] as const

const CreateSubSectionSchema = z.object({
  sectionId: objectId("A valid section id is required"),
  title: text({ max: 200, label: "Lecture title" }),
  description: text({ max: 5000, label: "Lecture description" }),
  videoPublicId: text({ max: 300, label: "Video" }),
  freePreview: z.coerce.boolean().optional().default(false),
})

const UpdateSubSectionSchema = z.object({
  subSectionId: objectId("A valid lecture id is required"),
  title: text({ max: 200, label: "Lecture title" }).optional(),
  description: text({ max: 5000, label: "Lecture description" }).optional(),
  videoPublicId: text({ max: 300, label: "Video" }).optional(),
  freePreview: z.coerce.boolean().optional(),
})

const ReorderSchema = z.object({
  sectionId: objectId("A valid section id is required"),
  orderedSubSectionIds: z.array(objectId()).min(1, "Missing required properties"),
})

const DeleteSubSectionSchema = z.object({
  subSectionId: objectId("A valid lecture id is required"),
})

const AddAttachmentSchema = z.object({
  subSectionId: objectId("A valid lecture id is required"),
  name: text({ max: 200, label: "Attachment name" }),
  // A student clicks this link from inside a course they paid for, so it
  // carries the platform's credibility. Restricting it to our own media host
  // is what stops a course page from being a delivery mechanism for someone
  // else's phishing page.
  url: httpsUrl(CLOUDINARY_HOSTS),
  publicId: text({ max: 300, label: "Attachment id" }),
})

const RemoveAttachmentSchema = z.object({
  subSectionId: objectId("A valid lecture id is required"),
  attachmentId: objectId("A valid attachment id is required"),
})

/**
 * Resolves a lecture together with the section that owns it, but only if the
 * caller is the instructor of the course that section belongs to.
 *
 * This is the single ownership check for this file, and it takes the LECTURE
 * id rather than trusting a caller-supplied `{ sectionId, subSectionId }`
 * pair. The pair is what made update/delete an IDOR: ownership was verified
 * against the instructor's own `sectionId` while the mutation was applied to
 * whatever `subSectionId` came with it, so any instructor could edit — or
 * permanently delete — any other instructor's lecture by guessing its id.
 */
async function findOwnedLecture(
  subSectionId: string,
  instructorId: Types.ObjectId | string
) {
  const section = await Section.findOne({ subSection: subSectionId })
  if (!section) return null

  const course = await Course.findOne({
    courseContent: section._id,
    instructor: instructorId,
  }).select("_id")
  if (!course) return null

  const subSection = await SubSection.findById(subSectionId)
  if (!subSection) return null

  return { section, subSection }
}

/** Section the caller owns, or null. Used by the create/reorder paths. */
async function findOwnedSection(
  sectionId: string,
  instructorId: Types.ObjectId | string
) {
  const course = await Course.findOne({
    courseContent: sectionId,
    instructor: instructorId,
  }).select("_id")
  if (!course) return null
  return Section.findById(sectionId)
}

const populatedSection = (sectionId: Types.ObjectId | string) =>
  Section.findById(sectionId).populate({
    path: "subSection",
    options: { sort: { order: 1 } },
  })

/**
 * Signed params for a direct browser-to-Cloudinary video upload. Vercel
 * caps serverless request bodies at 4.5MB, so buffering a lecture video
 * through this function could never work for a real video regardless of any
 * /tmp or size-limit fix — the bytes have to go straight from the browser to
 * Cloudinary.
 */
export const getVideoUploadSignature = async (req: Request, res: Response) => {
  try {
    const timestamp = Math.round(Date.now() / 1000)
    const env = getEnv()
    const folder = env.FOLDER_NAME
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      env.CLOUDINARY_API_SECRET
    )

    return res.status(200).json({
      success: true,
      data: {
        timestamp,
        folder,
        signature,
        apiKey: env.CLOUDINARY_API_KEY,
        cloudName: env.CLOUDINARY_CLOUD_NAME,
      },
    })
  } catch (error) {
    return fail(res, error, "getVideoUploadSignature", "Could not create an upload signature")
  }
}

/**
 * Re-fetches the asset from Cloudinary by its public_id rather than trusting
 * whatever URL/duration the client sends. A client that uploaded to a signed
 * folder still shouldn't get to dictate the videoUrl or duration a course is
 * stored with — this is the source of truth instead.
 */
export async function verifyUploadedVideo(publicId: string) {
  const resource = await cloudinary.api.resource(publicId, {
    resource_type: "video",
  })

  const folder = getEnv().FOLDER_NAME
  if (folder && !resource.public_id.startsWith(`${folder}/`)) {
    throw new Error("Video was not uploaded to the expected folder")
  }

  return resource
}

export const createSubSection = async (req: AuthedRequest, res: Response) => {
  try {
    const { sectionId, title, description, videoPublicId, freePreview } =
      parseOrThrow(CreateSubSectionSchema, req.body)

    const section = await findOwnedSection(sectionId, req.user.id)
    if (!section) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify this course",
      })
    }

    let uploadDetails
    try {
      uploadDetails = await verifyUploadedVideo(videoPublicId)
    } catch (error) {
      return fail(res, error, "createSubSection", "Could not verify the uploaded video")
    }

    // order defaults to the section's current lecture count (append to end),
    // until it's explicitly reordered via reorderSubSections.
    const subSection = await SubSection.create({
      title,
      timeDuration: `${uploadDetails.duration}`,
      description,
      videoUrl: uploadDetails.secure_url,
      videoPublicId: uploadDetails.public_id,
      order: section.subSection?.length ?? 0,
      freePreview,
      // Picked up by the transcribe-pending cron — see SubSection.ts.
      transcriptStatus: "pending",
    })

    await Section.updateOne({ _id: sectionId }, { $push: { subSection: subSection._id } })

    return res.status(201).json({ success: true, data: await populatedSection(sectionId) })
  } catch (error) {
    return fail(res, error, "createSubSection", "Could not add the lecture")
  }
}

export const updateSubSection = async (req: AuthedRequest, res: Response) => {
  try {
    const { subSectionId, title, description, videoPublicId, freePreview } =
      parseOrThrow(UpdateSubSectionSchema, req.body)

    const owned = await findOwnedLecture(subSectionId, req.user.id)
    if (!owned) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify this lecture",
      })
    }
    const { section, subSection } = owned

    if (title !== undefined) subSection.title = title
    if (description !== undefined) subSection.description = description
    if (freePreview !== undefined) subSection.freePreview = freePreview

    if (videoPublicId) {
      let uploadDetails
      try {
        uploadDetails = await verifyUploadedVideo(videoPublicId)
      } catch (error) {
        return fail(res, error, "updateSubSection", "Could not verify the uploaded video")
      }
      subSection.videoUrl = uploadDetails.secure_url
      subSection.videoPublicId = uploadDetails.public_id
      subSection.timeDuration = `${uploadDetails.duration}`
      // Video changed — the old transcript (if any) no longer matches.
      subSection.transcript = ""
      subSection.transcriptStatus = "pending"
    }

    await subSection.save()

    return res.json({
      success: true,
      data: await populatedSection(section._id),
      message: "Lecture updated successfully",
    })
  } catch (error) {
    return fail(res, error, "updateSubSection", "Could not update the lecture")
  }
}

// REORDER subsections within a section — the array index is the new order.
export const reorderSubSections = async (req: AuthedRequest, res: Response) => {
  try {
    const { sectionId, orderedSubSectionIds } = parseOrThrow(ReorderSchema, req.body)

    const section = await findOwnedSection(sectionId, req.user.id)
    if (!section) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify this course",
      })
    }

    const belongsToSection = orderedSubSectionIds.every((id) =>
      containsId(section.subSection, id)
    )
    if (
      !belongsToSection ||
      orderedSubSectionIds.length !== section.subSection.length
    ) {
      return res.status(400).json({
        success: false,
        message: "orderedSubSectionIds must be exactly the section's existing lectures",
      })
    }

    await Promise.all(
      orderedSubSectionIds.map((subSectionId, index) =>
        SubSection.updateOne({ _id: subSectionId }, { order: index })
      )
    )

    return res.json({
      success: true,
      data: await populatedSection(sectionId),
      message: "Lectures reordered",
    })
  } catch (error) {
    return fail(res, error, "reorderSubSections", "Could not reorder lectures")
  }
}

export const deleteSubSection = async (req: AuthedRequest, res: Response) => {
  try {
    const { subSectionId } = parseOrThrow(DeleteSubSectionSchema, req.body)

    const owned = await findOwnedLecture(subSectionId, req.user.id)
    if (!owned) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify this lecture",
      })
    }
    const { section, subSection } = owned

    await Section.updateOne({ _id: section._id }, { $pull: { subSection: subSectionId } })
    await SubSection.findByIdAndDelete(subSectionId)
    await deleteCloudinaryVideo(subSection.videoPublicId)

    return res.json({
      success: true,
      data: await populatedSection(section._id),
      message: "Lecture deleted successfully",
    })
  } catch (error) {
    return fail(res, error, "deleteSubSection", "Could not delete the lecture")
  }
}

/**
 * Removes the backing video from Cloudinary.
 *
 * Best-effort: the lecture row is already gone, and failing the request over a
 * media-host hiccup would leave the caller thinking the delete didn't happen.
 * Lectures created before `videoPublicId` was stored have nothing to delete
 * here and are skipped rather than guessed at from the URL.
 */
async function deleteCloudinaryVideo(publicId: string | undefined | null) {
  if (!publicId) return
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" })
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "orphaned_media",
        publicId,
        message: "Cloudinary video could not be deleted and is now orphaned",
        cause: error instanceof Error ? error.message : String(error),
      })
    )
  }
}

export const addAttachment = async (req: AuthedRequest, res: Response) => {
  try {
    const { subSectionId, name, url, publicId } = parseOrThrow(
      AddAttachmentSchema,
      req.body
    )

    const owned = await findOwnedLecture(subSectionId, req.user.id)
    if (!owned) {
      return res.status(403).json({ success: false, message: "Not authorized to modify this lecture" })
    }

    const subSection = await SubSection.findByIdAndUpdate(
      subSectionId,
      { $push: { attachments: { name, url, publicId } } },
      { new: true }
    )

    return res.status(200).json({ success: true, data: subSection })
  } catch (error) {
    return fail(res, error, "addAttachment", "Could not add attachment")
  }
}

export const removeAttachment = async (req: AuthedRequest, res: Response) => {
  try {
    const { subSectionId, attachmentId } = parseOrThrow(RemoveAttachmentSchema, req.body)

    const owned = await findOwnedLecture(subSectionId, req.user.id)
    if (!owned) {
      return res.status(403).json({ success: false, message: "Not authorized to modify this lecture" })
    }

    const subSection = await SubSection.findByIdAndUpdate(
      subSectionId,
      { $pull: { attachments: { _id: attachmentId } } },
      { new: true }
    )

    return res.status(200).json({ success: true, data: subSection })
  } catch (error) {
    return fail(res, error, "removeAttachment", "Could not remove attachment")
  }
}
