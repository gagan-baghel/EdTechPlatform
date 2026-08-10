import { useState } from "react"
import { AiFillCaretDown } from "react-icons/ai"
import { FaPlus } from "react-icons/fa"
import { MdDragIndicator, MdEdit } from "react-icons/md"
import { RiDeleteBin6Line } from "react-icons/ri"
import { RxDropdownMenu } from "react-icons/rx"
import { useDispatch, useSelector } from "react-redux"

import {
  deleteSection,
  deleteSubSection,
  reorderSections,
  reorderSubSections,
} from "../../../../../services/operations/courseDetailsAPI"
import { setCourse } from "../../../../../slices/courseSlice"
import ConfirmationModal from "../../../../common/ConfirmationModal"
import SubSectionModal from "./SubSectionModal"

export default function NestedView({ handleChangeEditSectionName }) {
  const { course } = useSelector((state) => state.course)
  const { token } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  // States to keep track of mode of modal [add, view, edit]
  const [addSubSection, setAddSubsection] = useState(null)
  const [viewSubSection, setViewSubSection] = useState(null)
  const [editSubSection, setEditSubSection] = useState(null)
  // to keep track of confirmation modal
  const [confirmationModal, setConfirmationModal] = useState(null)
  // Native HTML5 drag-and-drop — no new dependency for something the
  // platform already does. Tracks {type: "section"|"subsection", id,
  // sectionId?} for whatever's currently being dragged.
  const [dragged, setDragged] = useState(null)

  const handleSectionDrop = async (targetSectionId) => {
    if (!dragged || dragged.type !== "section" || dragged.id === targetSectionId) {
      setDragged(null)
      return
    }
    const currentIds = course.courseContent.map((s) => s._id)
    const fromIndex = currentIds.indexOf(dragged.id)
    const toIndex = currentIds.indexOf(targetSectionId)
    const reordered = [...currentIds]
    reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, dragged.id)

    setDragged(null)
    const updatedCourse = await reorderSections(
      { courseId: course._id, orderedSectionIds: reordered },
      token
    )
    if (updatedCourse) dispatch(setCourse(updatedCourse))
  }

  const handleSubSectionDrop = async (sectionId, targetSubSectionId) => {
    if (
      !dragged ||
      dragged.type !== "subsection" ||
      dragged.sectionId !== sectionId ||
      dragged.id === targetSubSectionId
    ) {
      setDragged(null)
      return
    }
    const section = course.courseContent.find((s) => s._id === sectionId)
    const currentIds = section.subSection.map((sub) => sub._id)
    const fromIndex = currentIds.indexOf(dragged.id)
    const toIndex = currentIds.indexOf(targetSubSectionId)
    const reordered = [...currentIds]
    reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, dragged.id)

    setDragged(null)
    const updatedSection = await reorderSubSections(
      { sectionId, orderedSubSectionIds: reordered },
      token
    )
    if (updatedSection) {
      const updatedCourseContent = course.courseContent.map((s) =>
        s._id === sectionId ? updatedSection : s
      )
      dispatch(setCourse({ ...course, courseContent: updatedCourseContent }))
    }
  }

  const handleDeleleSection = async (sectionId) => {
    const result = await deleteSection({
      sectionId,
      courseId: course._id,
      token,
    })
    if (result) {
      dispatch(setCourse(result))
    }
    setConfirmationModal(null)
  }

  const handleDeleteSubSection = async (subSectionId, sectionId) => {
    const result = await deleteSubSection({ subSectionId, sectionId, token })
    if (result) {
      // update the structure of course
      const updatedCourseContent = course.courseContent.map((section) =>
        section._id === sectionId ? result : section
      )
      const updatedCourse = { ...course, courseContent: updatedCourseContent }
      dispatch(setCourse(updatedCourse))
    }
    setConfirmationModal(null)
  }

  return (
    <>
      <div
        className="rounded-lg bg-richblack-700 p-6 px-8"
        id="nestedViewContainer"
      >
        {course?.courseContent?.map((section) => (
          // Section Dropdown
          <details
            key={section._id}
            open
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleSectionDrop(section._id)}
            className={dragged?.type === "section" && dragged.id !== section._id ? "opacity-90" : ""}
          >
            {/* Section Dropdown Content */}
            <summary className="flex cursor-pointer items-center justify-between border-b-2 border-b-richblack-600 py-2">
              <div className="flex items-center gap-x-3">
                <span
                  draggable
                  onDragStart={() => setDragged({ type: "section", id: section._id })}
                  className="cursor-grab text-richblack-400 active:cursor-grabbing"
                  aria-label="Drag to reorder section"
                  title="Drag to reorder"
                >
                  <MdDragIndicator className="text-xl" />
                </span>
                <RxDropdownMenu className="text-2xl text-richblack-50" />
                <p className="font-semibold text-richblack-50">
                  {section.sectionName}
                </p>
              </div>
              <div className="flex items-center gap-x-3">
                <button
                  onClick={() =>
                    handleChangeEditSectionName(
                      section._id,
                      section.sectionName
                    )
                  }
                >
                  <MdEdit className="text-xl text-richblack-300" />
                </button>
                <button
                  onClick={() =>
                    setConfirmationModal({
                      text1: "Delete this Section?",
                      text2: "All the lectures in this section will be deleted",
                      btn1Text: "Delete",
                      btn2Text: "Cancel",
                      btn1Handler: () => handleDeleleSection(section._id),
                      btn2Handler: () => setConfirmationModal(null),
                    })
                  }
                >
                  <RiDeleteBin6Line className="text-xl text-richblack-300" />
                </button>
                <span className="font-medium text-richblack-300">|</span>
                <AiFillCaretDown className={`text-xl text-richblack-300`} />
              </div>
            </summary>
            <div className="px-6 pb-4">
              {/* Render All Sub Sections Within a Section */}
              {section.subSection.map((data) => (
                <div
                  key={data?._id}
                  role="button"
                  tabIndex={0}
                  aria-label={`View lecture ${data.title}`}
                  onClick={() => setViewSubSection(data)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setViewSubSection(data)
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.stopPropagation()
                    handleSubSectionDrop(section._id, data._id)
                  }}
                  className="flex cursor-pointer items-center justify-between gap-x-3 border-b-2 border-b-richblack-600 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50 focus-visible:ring-inset"
                >
                  <div className="flex items-center gap-x-3 py-2 ">
                    <span
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation()
                        setDragged({ type: "subsection", id: data._id, sectionId: section._id })
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-grab text-richblack-400 active:cursor-grabbing"
                      aria-label="Drag to reorder lecture"
                      title="Drag to reorder"
                    >
                      <MdDragIndicator className="text-lg" />
                    </span>
                    <RxDropdownMenu className="text-2xl text-richblack-50" />
                    <p className="font-semibold text-richblack-50">
                      {data.title}
                    </p>
                  </div>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-x-3"
                  >
                    <button
                      onClick={() =>
                        setEditSubSection({ ...data, sectionId: section._id })
                      }
                    >
                      <MdEdit className="text-xl text-richblack-300" />
                    </button>
                    <button
                      onClick={() =>
                        setConfirmationModal({
                          text1: "Delete this Sub-Section?",
                          text2: "This lecture will be deleted",
                          btn1Text: "Delete",
                          btn2Text: "Cancel",
                          btn1Handler: () =>
                            handleDeleteSubSection(data._id, section._id),
                          btn2Handler: () => setConfirmationModal(null),
                        })
                      }
                    >
                      <RiDeleteBin6Line className="text-xl text-richblack-300" />
                    </button>
                  </div>
                </div>
              ))}
              {/* Add New Lecture to Section */}
              <button
                onClick={() => setAddSubsection(section._id)}
                className="mt-3 flex items-center gap-x-1 text-yellow-50"
              >
                <FaPlus className="text-lg" />
                <p>Add Lecture</p>
              </button>
            </div>
          </details>
        ))}
      </div>
      {/* Modal Display */}
      {addSubSection ? (
        <SubSectionModal
          modalData={addSubSection}
          setModalData={setAddSubsection}
          add={true}
        />
      ) : viewSubSection ? (
        <SubSectionModal
          modalData={viewSubSection}
          setModalData={setViewSubSection}
          view={true}
        />
      ) : editSubSection ? (
        <SubSectionModal
          modalData={editSubSection}
          setModalData={setEditSubSection}
          edit={true}
        />
      ) : (
        <></>
      )}
      {/* Confirmation Modal */}
      {confirmationModal ? (
        <ConfirmationModal modalData={confirmationModal} />
      ) : (
        <></>
      )}
    </>
  )
}