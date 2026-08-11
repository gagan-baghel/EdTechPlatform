"use client"

/** Minimal course shape the seat-allocation select needs. */
interface CourseOption {
  _id: string
  courseName: string
}

interface Organization {
  _id: string
  name: string
  inviteCode: string
  members: string[]
  courses: { course: { _id: string; courseName: string }; seatsTotal: number; seatsUsed: number }[]
}

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { toast } from "react-hot-toast"
import copy from "copy-to-clipboard"

import {
  createOrganization,
  fetchMyOrganizations,
  joinOrganization,
} from "../../../services/operations/organizationAPI"
import { getAllCourses } from "../../../services/operations/courseDetailsAPI"
import Button from "../../common/Button"
import Card from "../../common/Card"
import Input from "../../common/Input"
import Spinner from "../../common/Spinner"

import type { RootState } from "../../../store"
import React from "react"

export default function Organizations(): JSX.Element {
  const { token } = useSelector((state: RootState) => state.auth)
  const [orgs, setOrgs] = useState<Organization[] | null>(null)
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [name, setName] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [seats, setSeats] = useState<number | string>(10)
  const [inviteCode, setInviteCode] = useState("")
  const [creating, setCreating] = useState(false)

  const load = async () => {
    const [orgsResult, coursesResult] = await Promise.all([
      fetchMyOrganizations<Organization>(token as string),
      getAllCourses<CourseOption>(),
    ])
    setOrgs(orgsResult)
    setCourses(coursesResult)
    if (coursesResult.length > 0) setSelectedCourseId(coursesResult[0]._id)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !selectedCourseId || !seats) return

    setCreating(true)
    const result = await createOrganization(token as string, {
      name,
      courses: [{ courseId: selectedCourseId, seatsTotal: Number(seats) }],
    })
    if (result) {
      setName("")
      load()
    }
    setCreating(false)
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    const result = await joinOrganization(token as string, inviteCode)
    if (result) setInviteCode("")
  }

  const handleCopyInvite = (code: string) => {
    copy(code)
    toast.success("Invite code copied")
  }

  if (!orgs) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-10 text-3xl font-medium text-richblack-5">Organizations</h1>

      {orgs.length > 0 && (
        <div className="mb-10 flex flex-col gap-4">
          {orgs.map((org) => (
            <Card key={org._id} padding="p-5">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-richblack-5">{org.name}</p>
                <button
                  type="button"
                  onClick={() => handleCopyInvite(org.inviteCode)}
                  className="rounded-md border border-richblack-600 px-3 py-1 text-sm text-richblack-100 hover:border-yellow-50"
                >
                  Invite code: {org.inviteCode}
                </button>
              </div>
              <p className="mt-1 text-sm text-richblack-400">{org.members.length} member(s)</p>
              <div className="mt-3 flex flex-col gap-1">
                {org.courses.map((entry, i: number) => (
                  <p key={i} className="text-sm text-richblack-200">
                    {entry.course?.courseName}: {entry.seatsUsed}/{entry.seatsTotal} seats used
                  </p>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Card padding="p-5">
          <h2 className="mb-4 font-semibold text-richblack-5">Buy seats for your team</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <Input placeholder="Organization name" value={name} onChange={(e) => setName(e.target.value)} />
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="form-style w-full"
            >
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.courseName}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={1}
              placeholder="Number of seats"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
            />
            <Button type="submit" disabled={creating || courses.length === 0}>
              {creating ? "Creating..." : "Create organization"}
            </Button>
          </form>
        </Card>

        <Card padding="p-5">
          <h2 className="mb-4 font-semibold text-richblack-5">Join with an invite code</h2>
          <form onSubmit={handleJoin} className="flex flex-col gap-3">
            <Input
              placeholder="Invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            />
            <Button type="submit" variant="secondary">
              Join
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
