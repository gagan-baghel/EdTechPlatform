"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"

import { fetchEmailPreferences, updateEmailPreferences } from "../../../../services/operations/notificationAPI"
import Card from "../../../common/Card"

const NOTIFICATION_TYPES = [
  { key: "enrollment", label: "Course enrollment" },
  { key: "certificate_earned", label: "Certificate earned" },
  { key: "new_review", label: "New review on your course (instructors)" },
  { key: "qna_reply", label: "Replies to your questions" },
]

export default function NotificationPreferencesPanel() {
  const { token } = useSelector((state) => state.auth)
  const [preferences, setPreferences] = useState({})

  useEffect(() => {
    ;(async () => {
      const result = await fetchEmailPreferences(token)
      setPreferences(result)
    })()
  }, [token])

  const handleToggle = async (key, value) => {
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    await updateEmailPreferences(token, next)
  }

  return (
    <Card padding="p-6" className="my-6">
      <h2 className="mb-4 text-lg font-semibold text-richblack-5">Email notifications</h2>
      <div className="flex flex-col gap-3">
        {NOTIFICATION_TYPES.map((type) => (
          <label key={type.key} className="flex items-center justify-between text-sm text-richblack-100">
            {type.label}
            <input
              type="checkbox"
              checked={preferences[type.key] !== false}
              onChange={(e) => handleToggle(type.key, e.target.checked)}
              className="h-4 w-4 rounded border-richblack-500 bg-richblack-700"
            />
          </label>
        ))}
      </div>
    </Card>
  )
}
