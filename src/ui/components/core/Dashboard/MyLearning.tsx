"use client"

import { useEffect, useState, useCallback } from "react"
import { useSelector } from "react-redux"
import Image from "next/image"
import { useNavigate } from "@/ui/lib/router"

import { fetchWorkspace, removeCourseFromWishlist } from "../../../services/operations/workspaceAPI"
import { formatDate } from "../../../services/formatDate"
import Spinner from "../../common/Spinner"
import Card from "../../common/Card"

import type { RootState } from "../../../store"
import React from "react"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-richblack-5">{title}</h2>
      {children}
    </div>
  )
}

interface ContinueLearningItem {
  course: { _id: string; courseName: string; thumbnail: string }
  lastWatchedSubSection: string | null
  completedCount: number
}

interface CertificateSummary {
  _id: string
  certificateNumber: string
  course?: { courseName: string }
  issuedAt: string
}

interface CourseSummary {
  _id: string
  courseName: string
  thumbnail: string
}

/** Payload of GET /workspace — the student's learning home. */
interface WorkspaceData {
  continueLearning: ContinueLearningItem[]
  savedCourses: CourseSummary[]
  recentlyViewed: CourseSummary[]
  certificates: CertificateSummary[]
  streak?: number
}

export default function MyLearning() {
  const { token } = useSelector((state: RootState) => state.auth)
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)

  const load = useCallback(() => {
    return fetchWorkspace<WorkspaceData>(token as string).then((result) => {
      setWorkspace(result)
    })
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const handleContinue = (item: ContinueLearningItem) => {
    if (!item.lastWatchedSubSection) return
    navigate(`/courses/${item.course._id}`)
  }

  const handleUnsave = async (courseId: string) => {
    await removeCourseFromWishlist(token as string, courseId)
    void load()
  }

  if (!workspace) return <Spinner />

  return (
    <div>
      <h1 className="mb-10 text-3xl font-medium text-richblack-5">My Learning</h1>

      <div className="mb-10 flex gap-6">
        <Card padding="p-5" className="flex-1">
          <p className="text-sm text-richblack-300">Day streak</p>
          <p className="text-3xl font-bold text-yellow-50">{workspace.streak}</p>
        </Card>
        <Card padding="p-5" className="flex-1">
          <p className="text-sm text-richblack-300">Certificates earned</p>
          <p className="text-3xl font-bold text-caribbeangreen-100">{workspace.certificates.length}</p>
        </Card>
      </div>

      {workspace.continueLearning.length > 0 && (
        <Section title="Continue learning">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspace.continueLearning.map((item) => (
              <button
                key={item.course._id}
                onClick={() => handleContinue(item)}
                className="flex flex-col overflow-hidden rounded-md border border-richblack-700 bg-richblack-800 text-left hover:border-yellow-50"
              >
                <Image
                  src={item.course.thumbnail}
                  alt={item.course.courseName}
                  width={320}
                  height={160}
                  className="h-40 w-full object-cover"
                />
                <p className="p-3 font-semibold text-richblack-5">{item.course.courseName}</p>
              </button>
            ))}
          </div>
        </Section>
      )}

      {workspace.savedCourses.length > 0 && (
        <Section title="Saved for later">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspace.savedCourses.map((course) => (
              <Card key={course._id} padding="p-0" className="overflow-hidden">
                <Image
                  src={course.thumbnail}
                  alt={course.courseName}
                  width={320}
                  height={160}
                  className="h-40 w-full object-cover"
                />
                <div className="flex items-center justify-between p-3">
                  <p className="font-semibold text-richblack-5">{course.courseName}</p>
                  <button
                    onClick={() => handleUnsave(course._id)}
                    className="text-xs text-richblack-400 hover:text-pink-200"
                  >
                    Remove
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {workspace.recentlyViewed.length > 0 && (
        <Section title="Recently viewed">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspace.recentlyViewed.map((course) => (
              <div
                key={course._id}
                className="flex items-center gap-3 rounded-md border border-richblack-700 bg-richblack-800 p-3"
              >
                <Image
                  src={course.thumbnail}
                  alt={course.courseName}
                  width={64}
                  height={48}
                  className="h-12 w-16 rounded object-cover"
                />
                <p className="text-sm text-richblack-100">{course.courseName}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {workspace.certificates.length > 0 && (
        <Section title="Certificates">
          <div className="flex flex-col gap-2">
            {workspace.certificates.map((cert) => (
              <a
                key={cert._id}
                href={`/certificates/${cert.certificateNumber}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-md border border-richblack-700 bg-richblack-800 px-4 py-3 hover:border-yellow-50"
              >
                <span className="text-richblack-5">{cert.course?.courseName}</span>
                <span className="text-xs text-richblack-400">{formatDate(cert.issuedAt)}</span>
              </a>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
