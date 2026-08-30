import type { Attachment } from "@/types/domain"
import { useEffect, useState } from "react"
import type { CourseSubSection, CourseSection } from "@/ui/types"
import { useForm, type SubmitHandler } from "react-hook-form"
import { toast } from "react-hot-toast"
import { RxCross2 } from "react-icons/rx"
import { useDispatch, useSelector } from "react-redux"

import {
  createSubSection,
  updateSubSection,
} from "../../../../../services/operations/courseDetailsAPI"
import { setCourse } from "../../../../../slices/courseSlice"
import IconBtn from "../../../../common/IconBtn"
import Upload from "../Upload"
import AttachmentsManager from "./AttachmentsManager"
import type { RootState } from "../../../../../store"
import type { AppDispatch } from "../../../../../store"

interface SubSectionModalProps {
  /**
   * In "add" mode this is the parent section's id; in view/edit mode it is the
   * lecture being shown. The component branches on `add`/`view`/`edit`.
   */
  modalData: SubSectionModalData
  setModalData: (data: SubSectionModalData | null) => void
  add?: boolean
  view?: boolean
  edit?: boolean
}

export type SubSectionModalData =
  | string
  | (CourseSubSection & { sectionId?: string })

interface SubSectionFormData {
  lectureTitle: string
  lectureDesc: string
  lectureVideo: string
  freePreview: boolean
}

export default function SubSectionModal({
  modalData,
  setModalData,
  add = false,
  view = false,
  edit = false,
}: SubSectionModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    getValues,
  } = useForm<SubSectionFormData>()

  const dispatch = useDispatch<AppDispatch>()
  const [loading, setLoading] = useState(false)
  const [videoUploading, setVideoUploading] = useState(false)
  /** The lecture being viewed/edited; null while adding a new one. */
  const lecture = typeof modalData === "object" ? modalData : null
  /** The parent section id — a bare string only in "add" mode. */
  const parentSectionId: string | undefined =
    typeof modalData === "string" ? modalData : lecture?.sectionId

  const [attachments, setAttachments] = useState<Attachment[]>(
    lecture?.attachments ?? []
  )

  const { token } = useSelector((state: RootState) => state.auth)
  const { course } = useSelector((state: RootState) => state.course)

  useEffect(() => {
    if ((view || edit) && lecture) {
      setValue("lectureTitle", lecture.title)
      setValue("lectureDesc", lecture.description)
      setValue("lectureVideo", lecture.videoUrl)
      setValue("freePreview", Boolean(lecture.freePreview))
    }
  }, [
    edit,
    lecture,
    lecture?.description,
    lecture?.title,
    lecture?.videoUrl,
    lecture?.freePreview,
    setValue,
    view,
  ])

  // detect whether form is updated or not
  const isFormUpdated = () => {
    const currentValues = getValues()
    if (
      currentValues.lectureTitle !== lecture?.title ||
      currentValues.lectureDesc !== lecture?.description ||
      currentValues.lectureVideo !== lecture?.videoUrl ||
      currentValues.freePreview !== Boolean(lecture?.freePreview)
    ) {
      return true
    }
    return false
  }

  // handle the editing of subsection
  const handleEditSubsection = async () => {
    const currentValues = getValues()
    const formData = new FormData()
    formData.append("sectionId", parentSectionId ?? "")
    formData.append("subSectionId", lecture?._id ?? "")
    if (currentValues.lectureTitle !== lecture?.title) {
      formData.append("title", currentValues.lectureTitle)
    }
    if (currentValues.lectureDesc !== lecture?.description) {
      formData.append("description", currentValues.lectureDesc)
    }
    if (currentValues.lectureVideo !== lecture?.videoUrl) {
      formData.append("videoPublicId", currentValues.lectureVideo)
    }
    if (currentValues.freePreview !== Boolean(lecture?.freePreview)) {
      formData.append("freePreview", String(currentValues.freePreview))
    }
    setLoading(true)
    const result = await updateSubSection<CourseSection>(
      formData as unknown as Record<string, unknown>,
      token as string
    )
    if (result) {
      // update the structure of course
      // Guarded rather than optional-chained: without a course there is
      // nothing to update, and spreading `undefined` into the store would
      // replace a valid course with a partial object.
      if (course) {
        const updatedCourseContent = course.courseContent.map((section) =>
          section._id === parentSectionId ? result : section
        )
        dispatch(setCourse({ ...course, courseContent: updatedCourseContent }))
      }
    }
    setModalData(null)
    setLoading(false)
  }

  const onSubmit: SubmitHandler<SubSectionFormData> = async (data) => {
    if (view) return

    // A disabled submit button already blocks this, but Enter-to-submit on
    // a text field bypasses a disabled button entirely — this is the real
    // guard against submitting before the upload has produced a public_id.
    if (videoUploading) {
      toast.error("Please wait for the video to finish uploading.")
      return
    }

    if (edit) {
      if (!isFormUpdated()) {
        toast.error("No changes made to the form")
      } else {
        handleEditSubsection()
      }
      return
    }

    const formData = new FormData()
    formData.append("sectionId", parentSectionId ?? "")
    formData.append("title", data.lectureTitle)
    formData.append("description", data.lectureDesc)
    formData.append("videoPublicId", data.lectureVideo)
    formData.append("freePreview", String(Boolean(data.freePreview)))
    setLoading(true)
    const result = await createSubSection<CourseSection>(
      formData as unknown as Record<string, unknown>,
      token as string
    )
    if (result) {
      // update the structure of course
      if (course) {
        const updatedCourseContent = course.courseContent.map((section) =>
          section._id === parentSectionId ? result : section
        )
        dispatch(setCourse({ ...course, courseContent: updatedCourseContent }))
      }
    }
    setModalData(null)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[1000] !mt-0 grid h-screen w-screen place-items-center overflow-auto bg-white bg-opacity-10 backdrop-blur-sm">
      <div className="my-10 w-11/12 max-w-[700px] rounded-lg border border-richblack-400 bg-richblack-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between rounded-t-lg bg-richblack-700 p-5">
          <p className="text-xl font-semibold text-richblack-5">
            {view && "Viewing"} {add && "Adding"} {edit && "Editing"} Lecture
          </p>
          <button onClick={() => (!loading && !videoUploading ? setModalData(null) : {})}>
            <RxCross2 className="text-2xl text-richblack-5" />
          </button>
        </div>
        {/* Modal Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8 px-8 py-10"
        >
          {/* Lecture Video Upload */}
          <Upload
            name="lectureVideo"
            label="Lecture Video"
            register={register}
            setValue={setValue}
            errors={errors}
            video={true}
            viewData={view ? (lecture?.videoUrl ?? null) : null}
            editData={edit ? (lecture?.videoUrl ?? null) : null}
            onUploadingChange={setVideoUploading}
          />
          {/* Lecture Title */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm text-richblack-5" htmlFor="lectureTitle">
              Lecture Title {!view && <sup className="text-pink-200">*</sup>}
            </label>
            <input
              disabled={view || loading}
              id="lectureTitle"
              placeholder="Enter Lecture Title"
              aria-invalid={errors.lectureTitle ? "true" : undefined}
              aria-describedby={errors.lectureTitle ? "lectureTitle-error" : undefined}
              {...register("lectureTitle", { required: true })}
              className="form-style w-full"
            />
            {errors.lectureTitle && (
              <span id="lectureTitle-error" role="alert" className="ml-2 text-xs tracking-wide text-pink-200">
                Lecture title is required
              </span>
            )}
          </div>
          {/* Lecture Description */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm text-richblack-5" htmlFor="lectureDesc">
              Lecture Description{" "}
              {!view && <sup className="text-pink-200">*</sup>}
            </label>
            <textarea
              disabled={view || loading}
              id="lectureDesc"
              placeholder="Enter Lecture Description"
              aria-invalid={errors.lectureDesc ? "true" : undefined}
              aria-describedby={errors.lectureDesc ? "lectureDesc-error" : undefined}
              {...register("lectureDesc", { required: true })}
              className="form-style resize-x-none min-h-[130px] w-full"
            />
            {errors.lectureDesc && (
              <span id="lectureDesc-error" role="alert" className="ml-2 text-xs tracking-wide text-pink-200">
                Lecture Description is required
              </span>
            )}
          </div>
          {!view && (
            <label htmlFor="freePreview" className="inline-flex items-center gap-2 text-sm text-richblack-300">
              <input
                type="checkbox"
                id="freePreview"
                disabled={loading}
                {...register("freePreview")}
                className="h-4 w-4 rounded border-richblack-500 bg-richblack-700"
              />
              Let anyone preview this lecture for free, before buying
            </label>
          )}
          {edit && lecture?._id && (
            <AttachmentsManager
              subSectionId={lecture?._id ?? ""}
              courseId={course?._id ?? ""}
              token={token ?? ""}
              attachments={attachments}
              onChange={setAttachments}
            />
          )}
          {!view && (
            <div className="flex justify-end">
              <IconBtn
                disabled={loading || videoUploading}
                text={
                  loading
                    ? "Loading.."
                    : videoUploading
                    ? "Uploading video…"
                    : edit
                    ? "Save Changes"
                    : "Save"
                }
              />
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
