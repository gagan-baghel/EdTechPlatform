"use client"

import { useEffect } from "react"
import { Player } from "video-react"
import { RxCross2 } from "react-icons/rx"

// The "value in the first five minutes" onboarding lever — a visitor can
// watch a lecture an instructor marked freePreview before ever creating an
// account, let alone paying.
export default function FreePreviewModal({ subSection, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKeyDown)
    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${subSection.title}`}
      className="fixed inset-0 z-[1100] grid place-items-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-md bg-richblack-800 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold text-richblack-5">{subSection.title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="text-richblack-300 hover:text-richblack-5"
          >
            <RxCross2 size={20} />
          </button>
        </div>
        <Player aspectRatio="16:9" playsInline autoPlay src={subSection.videoUrl} />
      </div>
    </div>
  )
}
