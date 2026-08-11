import type { Attachment } from "@/types/domain"
import { useRef, useState, type ChangeEvent } from "react"
import { toast } from "react-hot-toast"
import { FiFile, FiTrash2, FiUploadCloud } from "react-icons/fi"

import {
  addAttachment,
  removeAttachment,
  uploadAttachmentToCloudinary,
} from "../../../../../services/operations/courseDetailsAPI"

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024 // 20MB

interface AttachmentsManagerProps {
  subSectionId: string
  courseId: string
  token: string
  attachments: Attachment[]
  onChange: React.Dispatch<React.SetStateAction<Attachment[]>>
}

// Only rendered in edit mode — a lecture needs to exist (have an _id)
// before a file can be attached to it.
export default function AttachmentsManager({ subSectionId, courseId, token, attachments, onChange }: AttachmentsManagerProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return

    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(`That file is too large (max ${MAX_ATTACHMENT_BYTES / 1024 / 1024}MB).`)
      return
    }

    setUploading(true)
    try {
      const { publicId, url } = await uploadAttachmentToCloudinary(file, token)
      const updated = await addAttachment<{ attachments: Attachment[] }>(
        { subSectionId, courseId, name: file.name, url, publicId },
        token as string
      )
      if (updated) onChange(updated.attachments)
    } catch {
      toast.error("Could not upload attachment")
    }
    setUploading(false)
  }

  const handleRemove = async (attachmentId: string) => {
    const updated = await removeAttachment<{ attachments: Attachment[] }>(
      { subSectionId, courseId, attachmentId },
      token as string
    )
    if (updated) onChange(updated.attachments)
  }

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm text-richblack-5">Resources (slides, code, worksheets)</label>
      <div className="flex flex-col gap-2">
        {attachments?.map((attachment) => (
          <div
            key={attachment._id ?? attachment.url}
            className="flex items-center justify-between rounded-md border border-richblack-600 px-3 py-2"
          >
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-richblack-100 hover:text-yellow-50"
            >
              <FiFile /> {attachment.name}
            </a>
            <button
              type="button"
              onClick={() => handleRemove(attachment._id ?? "")}
              className="text-richblack-400 hover:text-pink-200"
              aria-label={`Remove ${attachment.name}`}
            >
              <FiTrash2 />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex w-fit items-center gap-2 rounded-md border border-dashed border-richblack-500 px-3 py-2 text-sm text-richblack-300 hover:text-richblack-5"
      >
        <FiUploadCloud /> {uploading ? "Uploading..." : "Add a resource"}
      </button>
      <input ref={inputRef} type="file" onChange={handleFileSelect} className="hidden" />
    </div>
  )
}
