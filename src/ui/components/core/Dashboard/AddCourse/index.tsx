import RenderSteps from "./RenderSteps"
import CopilotOutlineHelper from "./CopilotOutlineHelper"

export default function AddCourse() {
  return (
    <>
      <div className="flex w-full items-start gap-x-6">
        <div className="flex flex-1 flex-col">
          <h1 className="mb-6 text-3xl font-medium text-richblack-5">
            Add Course
          </h1>
          <CopilotOutlineHelper />
          <div className="flex-1">
            <RenderSteps />
          </div>
        </div>
        {/* Course Upload Tips */}
        <div className="sticky top-10 hidden max-w-[400px] flex-1 rounded-md border-[1px] border-richblack-700 bg-richblack-800 p-6 xl:block">
          <p className="mb-8 text-lg text-richblack-5">⚡ Course Upload Tips</p>
          <ul className="ml-5 list-item list-disc space-y-4 text-xs text-richblack-5">
            <li>Set the Course Price option — a price above zero is required.</li>
            <li>Standard size for the course thumbnail is 1024x576.</li>
            <li>Video section controls the course overview video.</li>
            <li>Course Builder is where you create & organize a course.</li>
            <li>
              Add sections in the Course Builder to organize your lessons
              into lectures.
            </li>
            <li>
              Information from the Additional Data section shows up on the
              course single page.
            </li>
          </ul>
        </div>
      </div>
    </>
  )
}
