"use client"
import type { Profile } from "@/types/domain"
import type { FontScale } from "../../../../hooks/useAccessibilityPrefs"

import { useState } from "react"
import { useSelector } from "react-redux"
import { toast } from "react-hot-toast"

import { apiConnector } from "../../../../services/apiconnector"
import { profileEndpoints } from "../../../../services/apis"
import { useAccessibilityPrefs } from "../../../../hooks/useAccessibilityPrefs"
import { useTheme } from "../../../../providers/ThemeProvider"
import { SUPPORTED_LOCALES, useLocaleSwitcher } from "../../../../providers/LocaleProvider"
import Card from "../../../common/Card"
import type { RootState } from "../../../../store"

// Intl.supportedValuesOf is modern (Chrome 99+/Safari 15.4+) but not
// universal — the whole timezone select degrades to a short curated list
// on anything older instead of throwing.
function listTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone")
  } catch {
    return [
      "UTC",
      "Asia/Kolkata",
      "Asia/Dubai",
      "Asia/Singapore",
      "Europe/London",
      "Europe/Berlin",
      "America/New_York",
      "America/Chicago",
      "America/Los_Angeles",
      "Australia/Sydney",
    ]
  }
}

export default function PreferencesPanel() {
  const { token } = useSelector((state: RootState) => state.auth)
  const { user } = useSelector((state: RootState) => state.profile)
  const details: Partial<Profile> = user?.additionalDetails ?? {}

  const [weeklyGoalMinutes, setWeeklyGoalMinutes] = useState(details.weeklyGoalMinutes ?? 0)
  const [defaultPlaybackSpeed, setDefaultPlaybackSpeed] = useState(details.defaultPlaybackSpeed ?? 1)
  const [autoplayNext, setAutoplayNext] = useState(details.autoplayNext ?? true)
  const [timezone, setTimezoneState] = useState(
    details.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const { reducedMotion, setReducedMotion, fontScale, setFontScale } = useAccessibilityPrefs()
  const { theme, setTheme } = useTheme()
  const { locale, setLocale } = useLocaleSwitcher()
  const timezones = listTimezones()

  const savePreferences = async (patch: Record<string, string | number | boolean | null>) => {
    try {
      await apiConnector("PUT", profileEndpoints.UPDATE_PREFERENCES_API, patch, {
        Authorization: `Bearer ${token}`,
      })
    } catch {
      toast.error("Could not save preference")
    }
  }

  const handleTimezoneChange = (value: string) => {
    setTimezoneState(value)
    savePreferences({ timezone: value })
  }

  const handleThemeChange = (value: "dark" | "light") => {
    setTheme(value)
    savePreferences({ theme: value })
  }

  const handleLocaleChange = (value: string) => {
    setLocale(value)
    savePreferences({ locale: value })
  }

  const handleExportData = async () => {
    try {
      const response = await apiConnector("GET", profileEndpoints.EXPORT_MY_DATA_API, null, {
        Authorization: `Bearer ${token}`,
      })
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "my-intellecraft-data.json"
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Could not export your data")
    }
  }

  return (
    <>
      <Card padding="p-6" className="my-6">
        <h2 className="mb-4 text-lg font-semibold text-richblack-5">Learning & playback</h2>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-richblack-100">
            Weekly learning goal (minutes)
            <input
              type="number"
              min={0}
              value={weeklyGoalMinutes}
              onChange={(e) => setWeeklyGoalMinutes(Number(e.target.value))}
              onBlur={() => savePreferences({ weeklyGoalMinutes })}
              className="form-style w-32"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-richblack-100">
            Default playback speed
            <select
              value={defaultPlaybackSpeed}
              onChange={(e) => {
                setDefaultPlaybackSpeed(Number(e.target.value))
                savePreferences({ defaultPlaybackSpeed: Number(e.target.value) })
              }}
              className="form-style w-32"
            >
              {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                <option key={speed} value={speed}>
                  {speed}x
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between text-sm text-richblack-100">
            Autoplay next lecture
            <input
              type="checkbox"
              checked={autoplayNext}
              onChange={(e) => {
                setAutoplayNext(e.target.checked)
                savePreferences({ autoplayNext: e.target.checked })
              }}
              className="h-4 w-4 rounded border-richblack-500 bg-richblack-700"
            />
          </label>
        </div>
      </Card>

      <Card padding="p-6" className="my-6">
        <h2 className="mb-4 text-lg font-semibold text-richblack-5">Appearance & language</h2>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-richblack-100">
            Theme
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value as "dark" | "light")}
              className="form-style w-40"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-richblack-100">
            Language
            <select
              value={locale}
              onChange={(e) => handleLocaleChange(e.target.value)}
              className="form-style w-40"
            >
              {SUPPORTED_LOCALES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-richblack-100">
            Timezone
            <select
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="form-style w-full max-w-xs"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card padding="p-6" className="my-6">
        <h2 className="mb-4 text-lg font-semibold text-richblack-5">Accessibility</h2>
        <div className="flex flex-col gap-4">
          <label className="flex items-center justify-between text-sm text-richblack-100">
            Reduce motion
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              className="h-4 w-4 rounded border-richblack-500 bg-richblack-700"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-richblack-100">
            Text size
            <select
              value={fontScale}
              onChange={(e) => setFontScale(e.target.value as FontScale)}
              className="form-style w-32"
            >
              <option value="normal">Normal</option>
              <option value="large">Large</option>
              <option value="x-large">Extra large</option>
            </select>
          </label>
        </div>
      </Card>

      <Card padding="p-6" className="my-6">
        <h2 className="mb-2 text-lg font-semibold text-richblack-5">Your data</h2>
        <p className="mb-4 text-sm text-richblack-300">
          Download a copy of your profile, payments, certificates, notes and progress.
        </p>
        <button
          type="button"
          onClick={handleExportData}
          className="rounded-md border border-richblack-500 px-4 py-2 text-sm font-semibold text-richblack-5 hover:bg-richblack-700"
        >
          Export my data
        </button>
      </Card>
    </>
  )
}
