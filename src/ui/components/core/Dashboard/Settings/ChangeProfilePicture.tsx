import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { FiUpload } from "react-icons/fi"
import { useDispatch, useSelector } from "react-redux"
import { toast } from "react-hot-toast"

import { updateDisplayPicture } from "../../../../services/operations/SettingsAPI"
import { normalizeAvatarUrl } from "../../../../utils/avatar"
import IconBtn from "../../../common/IconBtn"
import type { RootState, AppDispatch } from "../../../../store"

export default function ChangeProfilePicture() {
  const { token } = useSelector((state: RootState) => state.auth)
  const { user } = useSelector((state: RootState) => state.profile)
  const dispatch = useDispatch<AppDispatch>()

  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewSource, setPreviewSource] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      previewFile(file)
    }
  }

  const previewFile = (file: File) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => {
      setPreviewSource(reader.result as string)
    }
  }

  const handleFileUpload = () => {
    try {
      if (!imageFile) return
      setLoading(true)
      const formData = new FormData()
      formData.append("displayPicture", imageFile)
      dispatch(updateDisplayPicture(token as string, formData as unknown as Record<string, unknown>)).then(() => {
        setLoading(false)
      })
    } catch (error) {
      console.error("ChangeProfilePicture failed", error)
      toast.error(
        "We could not update your profile picture. Please try again."
      )
    }
  }

  useEffect(() => {
    if (imageFile) {
      previewFile(imageFile)
    }
  }, [imageFile])
  
  return (
    <>
      <div className="flex items-center justify-between rounded-md border-[1px] border-richblack-700 bg-richblack-800 p-8 px-12 text-richblack-5">
        <div className="flex items-center gap-x-4">
          <img
            src={
              previewSource ||
              normalizeAvatarUrl(user?.userImage, user?.firstName, user?.lastName)
            }
            alt={`profile-${user?.firstName}`}
            className="aspect-square w-[78px] rounded-full object-cover"
          />
          <div className="space-y-2">
            <p>Change Profile Picture</p>
            <div className="flex flex-row gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/gif, image/jpeg"
              />
              <button
                onClick={handleClick}
                disabled={loading}
                className="cursor-pointer rounded-md bg-richblack-700 py-2 px-5 font-semibold text-richblack-50"
              >
                Select
              </button>
              <IconBtn
                text={loading ? "Uploading..." : "Upload"}
                onClick={handleFileUpload}
              >
                {!loading && (
                  <FiUpload className="text-lg text-ink" />
                )}
              </IconBtn>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
