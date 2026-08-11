"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { Table, Tbody, Td, Th, Thead, Tr } from "react-super-responsive-table"

import { issueRefund, fetchRefunds, fetchRefundEligible } from "../../../../services/operations/adminAPI"
import { formatCurrency } from "../../../../utils/formatCurrency"
import { formatDate } from "../../../../services/formatDate"
import Spinner from "../../../common/Spinner"
import type { RootState } from "../../../../store"

const REASONS = [
  { value: "requested_by_customer", label: "Requested by customer" },
  { value: "completion_deadline_missed", label: "Completion deadline missed" },
  { value: "admin_discretion", label: "Admin discretion" },
]

interface Refund {
  _id: string
  createdAt: string
  amount: number
  reason: string
  status: string
  user?: {
    firstName: string
    lastName: string
  }
  courses?: Array<{ courseName: string }>
}

interface EligibleEntry {
  courseProgressId: string
  enrolledAt: string
  completionRatio: number
  user?: {
    firstName: string
    lastName: string
    email: string
  }
  course?: {
    courseName: string
  }
}

interface EligibleData {
  policy?: {
    deadlineDays: number
    completionThreshold: number
  }
  data: EligibleEntry[]
}

export default function RefundsTab() {
  const { token } = useSelector((state: RootState) => state.auth)
  const [refunds, setRefunds] = useState<Refund[] | null>(null)
  const [eligible, setEligible] = useState<EligibleData | null>(null)
  const [form, setForm] = useState({ paymentId: "", reason: "requested_by_customer", notes: "" })
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    const [refundResult, eligibleResult] = await Promise.all([
      fetchRefunds<Refund>(token as string),
      fetchRefundEligible<EligibleData & { success: true }>(token as string),
    ])
    if (refundResult) setRefunds(refundResult.data)
    if (eligibleResult) setEligible(eligibleResult)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const result = await issueRefund(token as string, form)
    if (result) {
      setForm({ paymentId: "", reason: "requested_by_customer", notes: "" })
      await load()
    }
    setSubmitting(false)
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-richblack-5">Issue a refund</h2>
      <p className="mb-4 text-sm text-richblack-300">
        Find the payment id via the Payments & Orders tab, then process the refund here — this
        calls Razorpay&apos;s real refund API and unenrolls the student.
      </p>
      <form onSubmit={handleSubmit} className="mb-10 flex flex-wrap items-end gap-2">
        <input
          required
          placeholder="Payment id (from Payments tab)"
          value={form.paymentId}
          onChange={(e) => setForm({ ...form, paymentId: e.target.value })}
          className="form-style w-64"
        />
        <select
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          className="form-style"
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <input
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="form-style w-64"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-pink-700 px-4 py-2 font-semibold text-paper disabled:opacity-60"
        >
          {submitting ? "Processing..." : "Issue refund"}
        </button>
      </form>

      <h2 className="mb-3 text-lg font-semibold text-richblack-5">
        Eligible for an outcome-based refund
        {eligible?.policy && (
          <span className="ml-2 text-xs font-normal text-richblack-400">
            (enrolled {eligible.policy.deadlineDays}+ days ago, under{" "}
            {Math.round(eligible.policy.completionThreshold * 100)}% complete)
          </span>
        )}
      </h2>
      {!eligible ? (
        <div className="mb-10 spinner" />
      ) : eligible.data.length === 0 ? (
        <p className="mb-10 text-richblack-300">No enrolments currently meet the policy.</p>
      ) : (
        <Table className="mb-10 rounded-md border border-richblack-700">
          <Thead>
            <Tr className="border-b border-richblack-700 text-left text-richblack-50">
              <Th className="px-4 py-3">Student</Th>
              <Th className="px-4 py-3">Course</Th>
              <Th className="px-4 py-3">Enrolled</Th>
              <Th className="px-4 py-3">Completion</Th>
            </Tr>
          </Thead>
          <Tbody>
            {eligible.data.map((entry) => (
              <Tr key={entry.courseProgressId} className="border-b border-richblack-800 text-richblack-100">
                <Td className="px-4 py-3">
                  {entry.user?.firstName} {entry.user?.lastName} ({entry.user?.email})
                </Td>
                <Td className="px-4 py-3">{entry.course?.courseName}</Td>
                <Td className="px-4 py-3">{formatDate(entry.enrolledAt)}</Td>
                <Td className="px-4 py-3">{Math.round(entry.completionRatio * 100)}%</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <h2 className="mb-3 text-lg font-semibold text-richblack-5">Refund history</h2>
      {!refunds ? (
        <Spinner />
      ) : refunds.length === 0 ? (
        <p className="text-richblack-300">No refunds issued yet.</p>
      ) : (
        <Table className="rounded-md border border-richblack-700">
          <Thead>
            <Tr className="border-b border-richblack-700 text-left text-richblack-50">
              <Th className="px-4 py-3">Date</Th>
              <Th className="px-4 py-3">Customer</Th>
              <Th className="px-4 py-3">Courses</Th>
              <Th className="px-4 py-3">Amount</Th>
              <Th className="px-4 py-3">Reason</Th>
              <Th className="px-4 py-3">Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {refunds.map((refund) => (
              <Tr key={refund._id} className="border-b border-richblack-800 text-richblack-100">
                <Td className="px-4 py-3">{formatDate(refund.createdAt)}</Td>
                <Td className="px-4 py-3">
                  {refund.user?.firstName} {refund.user?.lastName}
                </Td>
                <Td className="px-4 py-3">{refund.courses?.map((c) => c.courseName).join(", ")}</Td>
                <Td className="px-4 py-3">{formatCurrency(refund.amount)}</Td>
                <Td className="px-4 py-3">{refund.reason}</Td>
                <Td className="px-4 py-3">
                  <span className={refund.status === "processed" ? "text-caribbeangreen-100" : "text-pink-200"}>
                    {refund.status}
                  </span>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
