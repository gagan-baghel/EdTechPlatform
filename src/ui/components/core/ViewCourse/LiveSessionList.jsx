"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { Player } from "video-react"

import { fetchSessionsForCourse } from "../../../services/operations/liveSessionAPI"
import { formatDate } from "../../../services/formatDate"

// Mirrors QuizList.jsx's pattern in this same player: fetch, list,
// nothing shown if empty.
export default function LiveSessionList({ courseId }) {
  const { token } = useSelector((state) => state.auth)
  const [sessions, setSessions] = useState(null)
  const [playingId, setPlayingId] = useState(null)

  useEffect(() => {
    if (!courseId) return
    ;(async () => {
      const result = await fetchSessionsForCourse(token, courseId)
      setSessions(result)
    })()
  }, [courseId, token])

  if (!sessions || sessions.length === 0) return null

  const now = Date.now()

  return (
    <div className="mt-6">
      <h3 className="mb-3 text-lg font-semibold text-richblack-5">Live sessions</h3>
      <div className="flex flex-col gap-2">
        {sessions.map((session) => {
          const isUpcoming = new Date(session.scheduledAt).getTime() > now
          return (
            <div
              key={session._id}
              className="rounded-md border border-richblack-700 bg-richblack-800 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-richblack-5">{session.title}</p>
                  <p className="text-xs text-richblack-400">{formatDate(session.scheduledAt)}</p>
                </div>
                {isUpcoming ? (
                  <a
                    href={session.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-yellow-50 hover:underline"
                  >
                    Join
                  </a>
                ) : session.recordingVideoUrl ? (
                  <button
                    type="button"
                    onClick={() => setPlayingId(playingId === session._id ? null : session._id)}
                    className="text-sm font-semibold text-yellow-50 hover:underline"
                  >
                    {playingId === session._id ? "Hide recording" : "Watch recording"}
                  </button>
                ) : (
                  <span className="text-xs text-richblack-500">Recording not yet available</span>
                )}
              </div>
              {playingId === session._id && session.recordingVideoUrl && (
                <div className="mt-3">
                  <Player aspectRatio="16:9" playsInline src={session.recordingVideoUrl} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
