"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"

import { fetchFeatureFlags, upsertFeatureFlag } from "../../../../services/operations/adminAPI"
import Spinner from "../../../common/Spinner"
import type { RootState } from "../../../../store"

interface FeatureFlag {
  key: string
  enabled: boolean
  description?: string
  roles?: string[]
}

export default function FeatureFlagsTab() {
  const { token } = useSelector((state: RootState) => state.auth)
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null)
  const [newKey, setNewKey] = useState("")

  const load = async () => {
    const result = await fetchFeatureFlags<FeatureFlag>(token as string)
    if (result) setFlags(result.data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggle = async (flag: FeatureFlag) => {
    await upsertFeatureFlag(token as string, { key: flag.key, enabled: !flag.enabled, description: flag.description, roles: flag.roles })
    await load()
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKey.trim()) return
    await upsertFeatureFlag(token as string, { key: newKey.trim(), enabled: false })
    setNewKey("")
    await load()
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="new_flag_key"
          className="form-style"
        />
        <button type="submit" className="rounded-md bg-yellow-50 px-4 py-2 font-semibold text-ink">
          Add flag
        </button>
      </form>

      {!flags ? (
        <Spinner />
      ) : flags.length === 0 ? (
        <p className="text-richblack-300">No feature flags yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {flags.map((flag) => (
            <div
              key={flag.key}
              className="flex items-center justify-between rounded-md border border-richblack-700 bg-richblack-800 px-4 py-3"
            >
              <div>
                <p className="font-semibold text-richblack-5">{flag.key}</p>
                {flag.description && <p className="text-sm text-richblack-300">{flag.description}</p>}
                {flag.roles && flag.roles.length > 0 && (
                  <p className="text-xs text-richblack-400">Restricted to: {flag.roles.join(", ")}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleToggle(flag)}
                className={`rounded-md px-4 py-2 text-sm font-semibold ${
                  flag.enabled ? "bg-caribbeangreen-200 text-ink" : "bg-richblack-600 text-richblack-100"
                }`}
              >
                {flag.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
