"use client"

import { useEffect, useRef, useState } from "react"
import { useSelector } from "react-redux"
import { toast } from "react-hot-toast"
import { FiUploadCloud } from "react-icons/fi"

import {
  attachRecording,
  cancelSession,
  fetchSessionsForCourse,
  scheduleSession,
} from "../../../../../services/operations/liveSessionAPI"
import { uploadVideoToCloudinary } from "../../../../../services/operations/courseDetailsAPI"
import Button from "../../../../common/Button"
import Card from "../../../../common/Card"
import Input from "../../../../common/Input"
import { formatDate } from "../../../../../services/formatDate"
import type { RootState } from "../../../../../store"

interface LiveSession {
  _id: string
  title: string
  scheduledAt: string
  status: string
  meetingUrl: string
  recordingVideoUrl?: string
}

interface LiveSessionManagerProps {
  courseId: string
}

// The live call itself happens on whatever vendor the instructor already
// uses (Zoom/Meet/Teams) via meetingUrl — a plain link needs no new
// infrastructure. The recording, once the session is over, uploads
// through the exact same signed Cloudinary pipeline lecture videos use
// (uploadVideoToCloudinary), so there's no second video system here.
export default function LiveSessionManager({ courseId }: LiveSessionManagerProps) {
  const { token } = useSelector((state: RootState) => state.auth)
  const [sessions, setSessions] = useState<LiveSession[] | null>(null)
  const [title, setTitle] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [meetingUrl, setMeetingUrl] = useState("")
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingSessionId = useRef<string | null>(null)

  const load = async () => {
    const result = await fetchSessionsForCourse<LiveSession>(token as string, courseId)
    setSessions(result ?? [])
  }

  useEffect(() => {
    if (courseId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !scheduledAt || !meetingUrl.trim()) return

    const result = await scheduleSession(token as string, { courseId, title, scheduledAt, meetingUrl })
    if (result) {
      setTitle("")
      setScheduledAt("")
      setMeetingUrl("")
      load()
    }
  }

  const handleCancel = async (sessionId: string) => {
    await cancelSession(token as string, sessionId)
    load()
  }

  const triggerRecordingUpload = (sessionId: string) => {
    pendingSessionId.current = sessionId
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    const sessionId = pendingSessionId.current
    if (!file || !sessionId) return

    setUploadingFor(sessionId)
    setUploadProgress(0)
    try {
      const publicId = await uploadVideoToCloudinary(file, token as string, setUploadProgress)
      await attachRecording(token as string, sessionId, publicId)
      load()
    } catch {
      toast.error("Recording upload failed")
    }
    setUploadingFor(null)
  }

  if (!sessions) return null

  return (
    <div className="mt-10">
      <h2 className="mb-4 text-xl font-semibold text-richblack-5">Live sessions</h2>

      <input ref={fileInputRef} type="file" accept="video/mp4" onChange={handleFileSelected} className="hidden" />

      {sessions.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          {sessions.map((session) => (
            <Card key={session._id} padding="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-richblack-5">{session.title}</p>
                  <p className="text-xs text-richblack-300">{formatDate(session.scheduledAt)}</p>
                </div>
                {session.status !== "cancelled" && (
                  <Button size="sm" variant="danger" onClick={() => handleCancel(session._id)}>
                    Cancel
                  </Button>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <a
                  href={session.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-yellow-50 hover:underline"
                >
                  Meeting link
                </a>
                {session.recordingVideoUrl ? (
                  <span className="text-sm text-caribbeangreen-100">Recording attached</span>
                ) : (
                  <button
                    type="button"
                    disabled={uploadingFor === session._id}
                    onClick={() => triggerRecordingUpload(session._id)}
                    className="flex items-center gap-1 text-sm text-richblack-300 hover:text-richblack-5"
                  >
                    <FiUploadCloud />
                    {uploadingFor === session._id ? `Uploading… ${uploadProgress}%` : "Upload recording"}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card padding="p-5">
        <h3 className="mb-4 font-semibold text-richblack-5">Schedule a session</h3>
        <form onSubmit={handleSchedule} className="flex flex-col gap-3">
          <Input placeholder="Session title" value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="form-style w-fit"
          />
          <Input
            placeholder="Meeting link (Zoom, Meet, Teams...)"
            value={meetingUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMeetingUrl(e.target.value)}
          />
          <Button type="submit" className="w-fit">
            Schedule
          </Button>
        </form>
      </Card>
    </div>
  )
}
