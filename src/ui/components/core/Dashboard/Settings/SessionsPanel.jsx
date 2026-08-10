"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { toast } from "react-hot-toast"

import { apiConnector } from "../../../../services/apiconnector"
import { endpoints } from "../../../../services/apis"
import { formatDate } from "../../../../services/formatDate"
import Card from "../../../common/Card"
import Button from "../../../common/Button"

export default function SessionsPanel() {
  const { token } = useSelector((state) => state.auth)
  const [sessions, setSessions] = useState(null)

  const load = async () => {
    try {
      const response = await apiConnector("GET", endpoints.SESSIONS_API, null, {
        Authorization: `Bearer ${token}`,
      })
      setSessions(response.data?.data || [])
    } catch (error) {
      setSessions([])
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRevoke = async (sessionId) => {
    try {
      await apiConnector("DELETE", `${endpoints.SESSIONS_API}/${sessionId}`, null, {
        Authorization: `Bearer ${token}`,
      })
      load()
    } catch (error) {
      toast.error("Could not revoke that session")
    }
  }

  const handleRevokeOthers = async () => {
    try {
      await apiConnector("POST", endpoints.REVOKE_OTHER_SESSIONS_API, null, {
        Authorization: `Bearer ${token}`,
      })
      toast.success("Signed out of all other devices")
      load()
    } catch (error) {
      toast.error("Could not sign out other devices")
    }
  }

  if (!sessions) return null

  return (
    <Card padding="p-6" className="my-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-richblack-5">Active sessions</h2>
        {sessions.length > 1 && (
          <Button variant="outline" size="sm" onClick={handleRevokeOthers}>
            Log out everywhere else
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {sessions.map((session) => (
          <div
            key={session._id}
            className="flex items-center justify-between rounded-md border border-richblack-700 px-4 py-3"
          >
            <div>
              <p className="text-sm text-richblack-100">
                {session.userAgent?.slice(0, 60) || "Unknown device"}
                {session.isCurrent && <span className="ml-2 text-xs text-caribbeangreen-100">(this device)</span>}
              </p>
              <p className="text-xs text-richblack-400">Last active {formatDate(session.lastSeenAt)}</p>
            </div>
            {!session.isCurrent && (
              <button
                type="button"
                onClick={() => handleRevoke(session._id)}
                className="text-xs text-pink-200 hover:underline"
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
