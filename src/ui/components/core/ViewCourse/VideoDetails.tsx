"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "@/ui/lib/router"
import Image from "next/image"

import { updateCompletedLectures } from "../../../slices/viewCourseSlice"
import { markLectureAsComplete, updateWatchPosition } from "../../../services/operations/courseDetailsAPI"
import IconBtn from "../../common/IconBtn"
import type { RootState } from "../../../store"
import type { AppDispatch } from "../../../store"

const HEARTBEAT_INTERVAL_MS = 5000

export default function VideoDetails() {
  const { courseId, sectionId, subSectionId } = useParams<{ courseId: string; sectionId: string; subSectionId: string }>()
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const playerRef = useRef<HTMLVideoElement | null>(null)
  
  const { token } = useSelector((state: RootState) => state.auth)
  const { user } = useSelector((state: RootState) => state.profile)
  const {
    courseSectionData,
    courseEntireData,
    completedLectures,
    watchState,
  } = useSelector((state: RootState) => state.viewCourse)
  // These are user preferences, not a store slice. The migration briefly
  // read them from `state.player`, which does not exist in the reducer —
  // destructuring undefined would have thrown on every lecture page.
  const defaultPlaybackSpeed = user?.additionalDetails?.defaultPlaybackSpeed || 1
  const autoplayNext = user?.additionalDetails?.autoplayNext !== false

  const [videoEndedId, setVideoEndedId] = useState<string | null>(null)
  const videoEnded = videoEndedId === subSectionId
  const [loading, setLoading] = useState<boolean>(false)
  const lastHeartbeatAtRef = useRef<number>(0)
  const hasResumedRef = useRef<boolean>(false)

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

  // We no longer need to reset videoEnded state here because it's derived
  // from videoEndedId === subSectionId. When subSectionId changes, videoEnded
  // naturally becomes false, avoiding a setState cascade entirely.
  useEffect(() => {
    hasResumedRef.current = false
    lastHeartbeatAtRef.current = 0
  }, [subSectionId])

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
      playerRef.current.currentTime = savedPosition
    }
  }

  const handleTimeUpdate = () => {
    if (!playerRef.current) return

    const now = Date.now()
    if (now - lastHeartbeatAtRef.current < HEARTBEAT_INTERVAL_MS) return
    lastHeartbeatAtRef.current = now

    const { currentTime, duration } = playerRef.current
    if (!currentTime || !courseId || !subSectionId || !token) return

    updateWatchPosition(
      {
        courseId,
        subsectionId: subSectionId,
        positionSeconds: currentTime,
        durationSeconds: duration,
      },
      token
    ).then((result) => {
      if (result?.success && result.autoCompleted && !completedLectures.includes(subSectionId)) {
        dispatch(updateCompletedLectures(subSectionId))
      }
    })
  }

  const isFirstVideo = () => {
    return currentSectionIndex === 0 && currentSubSectionIndex === 0
  }

  const goToNextVideo = () => {
    if (!currentSection || !courseId) return

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

  const isLastVideo = () => {
    return (
      currentSectionIndex === courseSectionData.length - 1 &&
      currentSubSectionIndex === (currentSection?.subSection.length ?? 1) - 1
    )
  }

  const goToPrevVideo = () => {
    if (!currentSection || !courseId) return

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
    if (!courseId || !subSectionId || !token) return
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
        // video-react (abandoned since 2023, blocked a React 19 install) was
        // a styled wrapper around exactly this element — a 16:9 <video> plus
        // the ref-based seek/playbackRate/currentTime API it exposed, all of
        // which the native element already provides. `relative` replaces
        // what video-react's own wrapper div gave the end-of-video overlay
        // below to position itself against.
        <div className="relative">
          <video
            ref={playerRef}
            className="aspect-video w-full rounded-md bg-black"
            playsInline
            controls
            onEnded={() => {
              setVideoEndedId(subSectionId as string)
              if (autoplayNext && !isLastVideo()) goToNextVideo()
            }}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            src={videoData?.videoUrl}
          />
          {videoEnded && (
            <div
              style={{
                backgroundImage:
                  "linear-gradient(to top, rgb(0, 0, 0), rgba(0,0,0,0.7), rgba(0,0,0,0.5), rgba(0,0,0,0.1)",
              }}
              className="full absolute inset-0 z-[100] grid h-full place-content-center font-inter"
            >
              {!completedLectures.includes(subSectionId!) && (
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
                  if (playerRef.current) {
                    playerRef.current.currentTime = 0
                    playerRef.current.play()
                    setVideoEndedId(null)
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
        </div>
      )}

      <h1 className="mt-4 text-3xl font-semibold">{videoData?.title}</h1>
      <p className="pt-2 pb-6">{videoData?.description}</p>

      {videoData?.attachments && videoData.attachments.length > 0 && (
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
