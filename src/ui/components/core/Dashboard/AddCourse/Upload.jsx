import { useEffect, useRef, useState } from "react"
import { useDropzone } from "react-dropzone"
import { FiUploadCloud } from "react-icons/fi"
import { useSelector } from "react-redux"
import { toast } from "react-hot-toast"
import ProgressBar from "@ramonak/react-progress-bar"

import { Player } from "video-react"

import { uploadVideoToCloudinary } from "../../../../services/operations/courseDetailsAPI"

const MAX_VIDEO_BYTES = 500 * 1024 * 1024 // 500MB — generous, but not unbounded

export default function Upload({
  name,
  label,
  register,
  setValue,
  errors,
  video = false,
  viewData = null,
  editData = null,
  onUploadingChange,
}) {
  const { token } = useSelector((state) => state.auth)
  const [previewSource, setPreviewSource] = useState(
    viewData ? viewData : editData ? editData : ""
  )
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const inputRef = useRef(null)
  const objectUrlRef = useRef(null)

  const revokePreviewObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  // Object URLs must be revoked on unmount too, not just on explicit cancel.
  useEffect(() => () => revokePreviewObjectUrl(), [])

  useEffect(() => {
    onUploadingChange?.(uploading)
  }, [uploading, onUploadingChange])

  const resetUpload = () => {
    revokePreviewObjectUrl()
    setPreviewSource("")
    setValue(name, null)
  }

  const onDrop = (acceptedFiles, fileRejections) => {
    if (fileRejections?.length) {
      const reason = fileRejections[0]?.errors?.[0]?.message || "That file isn't supported."
      toast.error(reason)
      return
    }

    const file = acceptedFiles[0]
    if (!file) return

    if (video && file.size > MAX_VIDEO_BYTES) {
      toast.error(
        `That video is too large (max ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB).`
      )
      return
    }

    if (!video) {
      // Small file, base64 preview is fine and avoids managing a blob URL.
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onloadend = () => setPreviewSource(reader.result)
      setValue(name, file)
      return
    }

    // Video: an object URL avoids reading the whole file into memory as
    // base64 just to preview it, which could lock the tab on a large file.
    revokePreviewObjectUrl()
    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    setPreviewSource(objectUrl)

    // Straight to Cloudinary — never through our own API route, which
    // can't hold a real video (see uploadVideoToCloudinary's doc comment).
    setValue(name, null)
    setUploading(true)
    setUploadProgress(0)
    uploadVideoToCloudinary(file, token, setUploadProgress)
      .then((publicId) => {
        setValue(name, publicId)
      })
      .catch(() => {
        toast.error("The video upload failed. Please try again.")
        resetUpload()
      })
      .finally(() => setUploading(false))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: !video
      ? { "image/*": [".jpeg", ".jpg", ".png"] }
      : { "video/*": [".mp4"] },
    maxFiles: 1,
    disabled: uploading,
    onDrop,
  })

  useEffect(() => {
    register(name, { required: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register])

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm text-richblack-5" htmlFor={name}>
        {label} {!viewData && <sup className="text-pink-200">*</sup>}
      </label>
      <div
        className={`${
          isDragActive ? "bg-richblack-600" : "bg-richblack-700"
        } flex min-h-[250px] cursor-pointer items-center justify-center rounded-md border-2 border-dotted border-richblack-500`}
      >
        {previewSource ? (
          <div className="flex w-full flex-col p-6">
            {!video ? (
              <img
                src={previewSource}
                alt="Preview"
                className="h-full w-full rounded-md object-cover"
              />
            ) : (
              <Player aspectRatio="16:9" playsInline src={previewSource} />
            )}
            {uploading && (
              <div className="mt-3 flex flex-col gap-1">
                <ProgressBar
                  completed={uploadProgress}
                  height="8px"
                  isLabelVisible={false}
                />
                <span className="text-xs text-richblack-300">
                  Uploading video… {uploadProgress}%
                </span>
              </div>
            )}
            {!viewData && !uploading && (
              <button
                type="button"
                onClick={resetUpload}
                // richblack-400 on richblack-700 is ~3:1, below the 4.5:1
                // AA floor; richblack-200 clears it comfortably.
                className="mt-3 text-richblack-200 underline"
              >
                Cancel
              </button>
            )}
          </div>
        ) : (
          <div
            className="flex w-full flex-col items-center p-6"
            {...getRootProps()}
          >
            <input {...getInputProps()} ref={inputRef} />
            <div className="grid aspect-square w-14 place-items-center rounded-full bg-pure-greys-800">
              <FiUploadCloud className="text-2xl text-yellow-50" />
            </div>
            <p className="mt-2 max-w-[200px] text-center text-sm text-richblack-200">
              Drag and drop an {!video ? "image" : "video"}, or click to{" "}
              <span className="font-semibold text-yellow-50">Browse</span> a
              file
            </p>
            <ul className="mt-10 flex list-disc justify-between space-x-12 text-center  text-xs text-richblack-200">
              <li>Aspect ratio 16:9</li>
              <li>Recommended size 1024x576</li>
            </ul>
          </div>
        )}
      </div>
      {errors[name] && (
        <span className="ml-2 text-xs tracking-wide text-pink-200">
          {label} is required
        </span>
      )}
    </div>
  )
}
