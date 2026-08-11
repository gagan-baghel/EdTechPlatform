import React, { useState } from "react"
import { FiPlayCircle } from "react-icons/fi"
import { HiOutlineVideoCamera } from "react-icons/hi"
import FreePreviewModal from "./FreePreviewModal"
import type { CourseSubSection } from "@/ui/types"

interface CourseSubSectionAccordionProps {
  subSec: CourseSubSection
}

function CourseSubSectionAccordion({ subSec }: CourseSubSectionAccordionProps) {
  const [previewing, setPreviewing] = useState(false)
  const canPreview = subSec?.freePreview && subSec?.videoUrl

  return (
    <div>
      <div className="flex items-center justify-between py-2">
        <div className={`flex items-center gap-2`}>
          <span>
            <HiOutlineVideoCamera />
          </span>
          <p>{subSec?.title}</p>
        </div>
        {canPreview && (
          <button
            type="button"
            onClick={() => setPreviewing(true)}
            className="flex items-center gap-1 text-sm font-semibold text-yellow-50 hover:underline"
          >
            <FiPlayCircle /> Preview
          </button>
        )}
      </div>
      {previewing && <FreePreviewModal subSection={subSec} onClose={() => setPreviewing(false)} />}
    </div>
  )
}

export default CourseSubSectionAccordion
