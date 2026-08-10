import Image from "next/image"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "@/ui/lib/router"

import { BigPlayButton, Player } from "video-react"

import { markLectureAsComplete, updateWatchPosition } from "../../../services/operations/courseDetailsAPI"
import { updateCompletedLectures } from "../../../slices/viewCourseSlice"
import IconBtn from "../../common/IconBtn"

// How often to send a watch-position heartbeat while playing. Frequent
// enough that closing the tab loses at most this much progress; infrequent
// enough not to spam the API on the native timeupdate event, which fires
// roughly every 250ms.
const HEARTBEAT_INTERVAL_MS = 15000

const VideoDetails = () => {
  const { courseId, sectionId, subSectionId } = useParams()
  const navigate = useNavigate()
  const playerRef = useRef(null)
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)
  const { courseSectionData, courseEntireData, completedLectures, watchState } =
    useSelector((state) => state.viewCourse)
  const defaultPlaybackSpeed = user?.additionalDetails?.defaultPlaybackSpeed || 1
  const autoplayNext = user?.additionalDetails?.autoplayNext !== false

  const [videoEnded, setVideoEnded] = useState(false)
  const [loading, setLoading] = useState(false)
  const lastHeartbeatAtRef = useRef(0)
  const hasResumedRef = useRef(false)

  const currentSectionIndex = useMemo(
    () => courseSectionData.findIndex((section) => section._id === sectionId),
    [courseSectionData, sectionId]
  )

  const currentSection =
    currentSectionIndex >= 0 ? courseSectionData[currentSectionIndex] : null

  const currentSubSectionIndex = useMemo(
    () =>
      currentSection?.subSection?.findIndex((data) => data._id === subSectionId) ?? -1,
    [currentSection, subSectionId]
  )

  const videoData =
    currentSubSectionIndex >= 0 ? currentSection?.subSection?.[currentSubSectionIndex] : null
  const previewSource = courseEntireData?.thumbnail || ""

  useEffect(() => {
    if (!courseId || !sectionId || !subSectionId) {
      navigate(`/dashboard/enrolled-courses`)
    }
  }, [courseId, navigate, sectionId, subSectionId])

  useEffect(() => {
    setVideoEnded(false)
    hasResumedRef.current = false
    lastHeartbeatAtRef.current = 0
  }, [subSectionId])

  // Resume where the viewer left off — once per lecture load, not on every
  // timeupdate tick. onLoadedMetadata is the earliest point the player's
  // duration/seek target is actually valid to act on.
  const handleLoadedMetadata = () => {
    if (playerRef.current) {
      playerRef.current.playbackRate = defaultPlaybackSpeed
    }

    if (hasResumedRef.current) return
    hasResumedRef.current = true

    const savedPosition = watchState.find(
      (entry) => entry.subSection === subSectionId
    )?.positionSeconds

    if (savedPosition && playerRef.current) {
      playerRef.current.seek(savedPosition)
    }
  }

  const handleTimeUpdate = () => {
    if (!playerRef.current) return

    const now = Date.now()
    if (now - lastHeartbeatAtRef.current < HEARTBEAT_INTERVAL_MS) return
    lastHeartbeatAtRef.current = now

    const { currentTime, duration } = playerRef.current.getState().player
    if (!currentTime) return

    updateWatchPosition(
      {
        courseId,
        subsectionId: subSectionId,
        positionSeconds: currentTime,
        durationSeconds: duration,
      },
      token
    ).then((result) => {
      if (result?.autoCompleted && !completedLectures.includes(subSectionId)) {
        dispatch(updateCompletedLectures(subSectionId))
      }
    })
  }

  // check if the lecture is the first video of the course
  const isFirstVideo = () => {
    return currentSectionIndex === 0 && currentSubSectionIndex === 0
  }

  // go to the next video
  const goToNextVideo = () => {
    if (!currentSection) return

    const noOfSubsections = currentSection.subSection.length

    if (currentSubSectionIndex !== noOfSubsections - 1) {
      const nextSubSectionId = currentSection.subSection[currentSubSectionIndex + 1]._id
      navigate(
        `/view-course/${courseId}/section/${sectionId}/sub-section/${nextSubSectionId}`
      )
    } else if (currentSectionIndex < courseSectionData.length - 1) {
      const nextSectionId = courseSectionData[currentSectionIndex + 1]._id
      const nextSubSectionId = courseSectionData[currentSectionIndex + 1].subSection[0]._id
      navigate(
        `/view-course/${courseId}/section/${nextSectionId}/sub-section/${nextSubSectionId}`
      )
    }
  }

  // check if the lecture is the last video of the course
  const isLastVideo = () => {
    return (
      currentSectionIndex === courseSectionData.length - 1 &&
      currentSubSectionIndex === currentSection?.subSection.length - 1
    )
  }

  // go to the previous video
  const goToPrevVideo = () => {
    if (!currentSection) return

    if (currentSubSectionIndex !== 0) {
      const prevSubSectionId = currentSection.subSection[currentSubSectionIndex - 1]._id
      navigate(
        `/view-course/${courseId}/section/${sectionId}/sub-section/${prevSubSectionId}`
      )
    } else if (currentSectionIndex > 0) {
      const prevSectionId = courseSectionData[currentSectionIndex - 1]._id
      const prevSubSectionLength = courseSectionData[currentSectionIndex - 1].subSection.length
      const prevSubSectionId =
        courseSectionData[currentSectionIndex - 1].subSection[prevSubSectionLength - 1]._id
      navigate(
        `/view-course/${courseId}/section/${prevSectionId}/sub-section/${prevSubSectionId}`
      )
    }
  }

  const handleLectureCompletion = async () => {
    setLoading(true)
    const res = await markLectureAsComplete(
      { courseId: courseId, subsectionId: subSectionId },
      token
    )
    if (res) {
      dispatch(updateCompletedLectures(subSectionId))
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-5 text-richblack-5">
      {!videoData ? (
        <Image
          src={previewSource}
          alt="Preview"
          width={1280}
          height={720}
          className="h-full w-full rounded-md object-cover"
          sizes="100vw"
        />
      ) : (
        <Player
          ref={playerRef}
          aspectRatio="16:9"
          playsInline
          onEnded={() => {
            setVideoEnded(true)
            if (autoplayNext && !isLastVideo()) goToNextVideo()
          }}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          src={videoData?.videoUrl}
        >
          <BigPlayButton position="center" />
          {/* Render When Video Ends */}
          {videoEnded && (
            <div
              style={{
                backgroundImage:
                  "linear-gradient(to top, rgb(0, 0, 0), rgba(0,0,0,0.7), rgba(0,0,0,0.5), rgba(0,0,0,0.1)",
              }}
              className="full absolute inset-0 z-[100] grid h-full place-content-center font-inter"
            >
              {!completedLectures.includes(subSectionId) && (
                <IconBtn
                  disabled={loading}
                  onClick={() => handleLectureCompletion()}
                  text={!loading ? "Mark As Completed" : "Loading..."}
                  customClasses="text-xl max-w-max px-4 mx-auto"
                />
              )}
              <IconBtn
                disabled={loading}
                onClick={() => {
                  if (playerRef?.current) {
                    // set the current time of the video to 0
                    playerRef?.current?.seek(0)
                    setVideoEnded(false)
                  }
                }}
                text="Rewatch"
                customClasses="text-xl max-w-max px-4 mx-auto mt-2"
              />
              <div className="mt-10 flex min-w-[250px] justify-center gap-x-4 text-xl">
                {!isFirstVideo() && (
                  <button
                    disabled={loading}
                    onClick={goToPrevVideo}
                    className="blackButton"
                  >
                    Prev
                  </button>
                )}
                {!isLastVideo() && (
                  <button
                    disabled={loading}
                    onClick={goToNextVideo}
                    className="blackButton"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          )}
        </Player>
      )}

      <h1 className="mt-4 text-3xl font-semibold">{videoData?.title}</h1>
      <p className="pt-2 pb-6">{videoData?.description}</p>

      {videoData?.attachments?.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 font-semibold text-richblack-5">Resources</p>
          <div className="flex flex-col gap-2">
            {videoData.attachments.map((attachment) => (
              <a
                key={attachment._id}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border border-richblack-700 px-3 py-2 text-sm text-richblack-100 hover:border-yellow-50 hover:text-yellow-50"
              >
                {attachment.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoDetails
// video
