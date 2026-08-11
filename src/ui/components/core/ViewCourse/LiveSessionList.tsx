"use client"

import React, { useEffect, useState } from "react"
import { useSelector } from "react-redux"

import { fetchSessionsForCourse } from "../../../services/operations/liveSessionAPI"
import Spinner from "../../common/Spinner"
import type { RootState } from "../../../store"

interface LiveSession {
  _id: string
  title: string
  description?: string
  scheduledFor: string
  meetingLink?: string
}

interface LiveSessionListProps {
  courseId: string
}

export default function LiveSessionList({ courseId }: LiveSessionListProps) {
  const { token } = useSelector((state: RootState) => state.auth)
  const [sessions, setSessions] = useState<LiveSession[] | null>(null)

  useEffect(() => {
    if (!courseId) return
    ;(async () => {
      if (token) {
        const result = await fetchSessionsForCourse<LiveSession>(token, courseId)
        if (result) setSessions(result)
      }
    })()
  }, [courseId, token])

  if (!sessions) return <Spinner />
  if (sessions.length === 0) return null

  const now = new Date()

  return (
    <div className="mt-6">
      <h3 className="mb-3 text-lg font-semibold text-richblack-5">Upcoming live sessions</h3>
      <div className="flex flex-col gap-2">
        {sessions.map((session) => {
          const scheduledDate = new Date(session.scheduledFor)
          // Rough heuristic: if it was scheduled for more than 4 hours ago,
          // don't surface it as upcoming. (In a real implementation, the API
          // would filter this or we'd check an `endedAt` field.)
          if (now.getTime() - scheduledDate.getTime() > 4 * 60 * 60 * 1000) return null

          return (
            <div
              key={session._id}
              className="rounded-md border border-richblack-700 bg-richblack-800 p-4"
            >
              <h4 className="font-semibold text-richblack-5">{session.title}</h4>
              <p className="mt-1 text-sm text-richblack-300">
                {scheduledDate.toLocaleString()}
              </p>
              {session.description && (
                <p className="mt-2 text-sm text-richblack-100">{session.description}</p>
              )}
              {session.meetingLink && (
                <a
                  href={session.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block rounded-md bg-yellow-50 px-3 py-1.5 text-sm font-semibold text-ink"
                >
                  Join meeting
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
