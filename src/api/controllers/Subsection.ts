import type { Types } from "mongoose"
import { containsId } from "../lib/ids"
import type { Request, Response } from "express"
import { getEnv } from "../config/env"
import { fail } from "../lib/respond"
import type { AuthedRequest } from "../lib/http"
import SubSection from "../models/SubSection"
import Section from "../models/Section"
import Course from "../models/Course"
import cloudinaryModule from "cloudinary"
const cloudinary = cloudinaryModule.v2

/**
 * Signed params for a direct browser-to-Cloudinary video upload. Vercel
 * caps serverless request bodies at 4.5MB, so buffering a lecture video
 * through this function (the old req.files.video path) could never work
 * for a real video regardless of any /tmp or size-limit fix — the bytes
 * have to go straight from the browser to Cloudinary.
 */
export const getVideoUploadSignature = async (req: Request, res: Response) => {
  try {
    const timestamp = Math.round(Date.now() / 1000)
    const folder = getEnv().FOLDER_NAME
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      getEnv().CLOUDINARY_API_SECRET
    )

    return res.status(200).json({
      success: true,
      data: {
        timestamp,
        folder,
        signature,
        apiKey: getEnv().CLOUDINARY_API_KEY,
        cloudName: getEnv().CLOUDINARY_CLOUD_NAME,
      },
    })
  } catch (error) {
    return fail(res, error, "getVideoUploadSignature", "Could not create an upload signature")
  }
}

/**
 * Re-fetches the asset from Cloudinary by its public_id rather than
 * trusting whatever URL/duration the client sends. A client that uploaded
 * to a signed folder still shouldn't get to dictate the videoUrl or
 * duration a course is stored with — this is the source of truth instead.
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

// Exported for LiveSession.js's recording upload — same verify-by-
// re-fetching-from-Cloudinary logic, no reason to duplicate it.
export const createSubSection = async (req: AuthedRequest, res: Response) => {
    try {
      // Extract necessary information from the request body
      const { sectionId, title, description, videoPublicId, freePreview } = req.body

      // Check if all necessary fields are provided
      if (!sectionId || !title || !description || !videoPublicId) {
        return res
          .status(400)
          .json({ success: false, message: "All Fields are Required" })
      }
      const courseOwner = await Course.findOne({
        courseContent: sectionId,
        instructor: req.user.id,
      })
      if (!courseOwner) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to modify this course",
        })
      }

      const section = await Section.findById(sectionId)

      let uploadDetails
      try {
        uploadDetails = await verifyUploadedVideo(videoPublicId)
      } catch (error) {
    return fail(res, error, "createSubSection", "Could not verify the uploaded video")
  }

      // Create a new sub-section with the necessary information. order
      // defaults to the section's current lecture count (append to end),
      // matching prior array-position behavior until it's explicitly
      // reordered via reorderSubSections.
      const SubSectionDetails = await SubSection.create({
        title: title,
        timeDuration: `${uploadDetails.duration}`,
        description: description,
        videoUrl: uploadDetails.secure_url,
        order: section?.subSection?.length ?? 0,
        freePreview: freePreview === true || freePreview === "true",
        // Picked up by the transcribe-pending cron — see SubSection.js.
        transcriptStatus: "pending",
      })
  
      // Update the corresponding section with the newly created sub-section
      const updatedSection = await Section.findByIdAndUpdate(
        { _id: sectionId },
        { $push: { subSection: SubSectionDetails._id } },
        { new: true }
      ).populate({ path: "subSection", options: { sort: { order: 1 } } })
  
      // Return the updated section in the response
      return res.status(200).json({ success: true, data: updatedSection })
    } catch (error) {
      // Handle any errors that may occur during the process
      return fail(res, error, "createSubSection", "Internal server error")}
}
  
export const updateSubSection = async (req: AuthedRequest, res: Response) => {
    try {
      const { sectionId,subSectionId, title, description } = req.body
      if (!sectionId || !subSectionId) {
        return res.status(400).json({
          success: false,
          message: "Missing required properties",
        })
      }
      const courseOwner = await Course.findOne({
        courseContent: sectionId,
        instructor: req.user.id,
      })
      if (!courseOwner) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to modify this course",
        })
      }
      const subSection = await SubSection.findById(subSectionId)
  
      if (!subSection) {
        return res.status(404).json({
          success: false,
          message: "SubSection not found",
        })
      }
  
      if (title !== undefined) {
        subSection.title = title
      }
  
      if (description !== undefined) {
        subSection.description = description
      }
      if (req.body.freePreview !== undefined) {
        subSection.freePreview = req.body.freePreview === true || req.body.freePreview === "true"
      }
      if (req.body.videoPublicId) {
        let uploadDetails
        try {
          uploadDetails = await verifyUploadedVideo(req.body.videoPublicId)
        } catch (error) {
    return fail(res, error, "updateSubSection", "Could not verify the uploaded video")
  }
        subSection.videoUrl = uploadDetails.secure_url
        subSection.timeDuration = `${uploadDetails.duration}`
        // Video changed — the old transcript (if any) no longer matches.
        subSection.transcript = ""
        subSection.transcriptStatus = "pending"
      }
  
      await subSection.save()
  
      const updatedSection = await Section.findById(sectionId).populate({ path: "subSection", options: { sort: { order: 1 } } })


      return res.json({
        success: true,
        data:updatedSection,
        message: "Section updated successfully",
      })
    } catch (error) {
    return fail(res, error, "updateSubSection", "An error occurred while updating the section")
  }
}
  
// REORDER subsections within a section — same shape as reorderSections in
// Section.js: the array index is the new order value.
export const reorderSubSections = async (req: AuthedRequest, res: Response) => {
    try {
      const { sectionId, orderedSubSectionIds } = req.body
      if (!sectionId || !Array.isArray(orderedSubSectionIds) || orderedSubSectionIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Missing required properties",
        })
      }

      const courseOwner = await Course.findOne({
        courseContent: sectionId,
        instructor: req.user.id,
      })
      if (!courseOwner) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to modify this course",
        })
      }

      const section = await Section.findById(sectionId)
      if (!section) {
        return res.status(404).json({ success: false, message: "Section not found" })
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

      const updatedSection = await Section.findById(sectionId).populate({ path: "subSection", options: { sort: { order: 1 } } })

      return res.json({
        success: true,
        data: updatedSection,
        message: "Lectures reordered",
      })
    } catch (error) {
      return fail(res, error, "reorderSubSections", "Internal server error")}
}

export const deleteSubSection = async (req: AuthedRequest, res: Response) => {
    try {
      const { subSectionId, sectionId } = req.body
      if (!subSectionId || !sectionId) {
        return res.status(400).json({
          success: false,
          message: "Missing required properties",
        })
      }
      const courseOwner = await Course.findOne({
        courseContent: sectionId,
        instructor: req.user.id,
      })
      if (!courseOwner) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to modify this course",
        })
      }
      await Section.findByIdAndUpdate(
        { _id: sectionId },
        {
          $pull: {
            subSection: subSectionId,
          },
        }
      )
      const subSection = await SubSection.findByIdAndDelete({ _id: subSectionId })
  
      if (!subSection) {
        return res
          .status(404)
          .json({ success: false, message: "SubSection not found" })
      }

      const updatedSection = await Section.findById(sectionId).populate({ path: "subSection", options: { sort: { order: 1 } } })
  
      return res.json({
        success: true,
        data:updatedSection,
        message: "SubSection deleted successfully",
      })
    } catch (error) {
    return fail(res, error, "deleteSubSection", "An error occurred while deleting the SubSection")
  }
}

async function assertOwnsSubSection(
  subSectionId: string,
  instructorId: Types.ObjectId | string
) {
  const section = await Section.findOne({ subSection: subSectionId })
  if (!section) return false
  const course = await Course.findOne({ courseContent: section._id, instructor: instructorId })
  return Boolean(course)
}

export const addAttachment = async (req: AuthedRequest, res: Response) => {
  try {
    const { subSectionId, name, url, publicId } = req.body
    if (!subSectionId || !name || !url || !publicId) {
      return res.status(400).json({ success: false, message: "subSectionId, name, url and publicId are required" })
    }

    if (!(await assertOwnsSubSection(subSectionId, req.user.id))) {
      return res.status(403).json({ success: false, message: "Not authorized to modify this lecture" })
    }

    const subSection = await SubSection.findByIdAndUpdate(
      subSectionId,
      { $push: { attachments: { name, url, publicId } } },
      { new: true }
    )
    if (!subSection) {
      return res.status(404).json({ success: false, message: "SubSection not found" })
    }

    return res.status(200).json({ success: true, data: subSection })
  } catch (error) {
    return fail(res, error, "addAttachment", "Could not add attachment")
  }
}

export const removeAttachment = async (req: AuthedRequest, res: Response) => {
  try {
    const { subSectionId, attachmentId } = req.body
    if (!subSectionId || !attachmentId) {
      return res.status(400).json({ success: false, message: "subSectionId and attachmentId are required" })
    }

    if (!(await assertOwnsSubSection(subSectionId, req.user.id))) {
      return res.status(403).json({ success: false, message: "Not authorized to modify this lecture" })
    }

    const subSection = await SubSection.findByIdAndUpdate(
      subSectionId,
      { $pull: { attachments: { _id: attachmentId } } },
      { new: true }
    )
    if (!subSection) {
      return res.status(404).json({ success: false, message: "SubSection not found" })
    }

    return res.status(200).json({ success: true, data: subSection })
  } catch (error) {
    return fail(res, error, "removeAttachment", "Could not remove attachment")
  }
}
