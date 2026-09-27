"use client"

import { useEffect, useState, useCallback } from "react"
import { useSelector } from "react-redux"
import { Table, Tbody, Td, Th, Thead, Tr } from "react-super-responsive-table"

import {
  fetchMyPayoutProfile,
  fetchMyPayouts,
  submitPayoutProfile,
} from "../../../../services/operations/payoutAPI"
import { formatCurrency } from "../../../../utils/formatCurrency"
import { formatDate } from "../../../../services/formatDate"
import Spinner from "../../../common/Spinner"

import type { RootState } from "../../../../store"
import React from "react"
import { PageHeader } from "../../../common/DashKit"

const KYC_LABELS: Record<string, string> = {
  not_submitted: "Not submitted",
  pending: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
}

/** One payout run as the instructor's payouts table renders it. */
/** The instructor's masked payout profile. */
interface PayoutProfile {
  bankAccountHolderName: string
  bankAccountNumber: string | null
  ifscCode: string
  panNumber: string | null
  kycStatus: string
  kycRejectionReason?: string
  platformFeePercent: number
}

interface PayoutRun {
  _id: string
  periodStart: string
  periodEnd: string
  grossAmount: number
  platformFeeAmount: number
  netAmount: number
  status: string
  paidAt?: string
  transactionReference?: string
}

export default function Payouts() {
  const { token } = useSelector((state: RootState) => state.auth)
  const [profile, setProfile] = useState<PayoutProfile | null | undefined>(undefined) // undefined = loading, null = none yet
  const [payouts, setPayouts] = useState<PayoutRun[] | null>(null)
  const [form, setForm] = useState({
    bankAccountHolderName: "",
    bankAccountNumber: "",
    ifscCode: "",
    panNumber: "",
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    return Promise.all([
      fetchMyPayoutProfile<PayoutProfile>(token as string),
      fetchMyPayouts<PayoutRun>(token as string),
    ]).then(([profileResult, payoutsResult]) => {
      setProfile(profileResult?.data ?? null)
      setPayouts(payoutsResult?.data ?? [])
    })
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const result = await submitPayoutProfile(token as string, form)
    if (result) {
      setForm({ bankAccountHolderName: "", bankAccountNumber: "", ifscCode: "", panNumber: "" })
      await load()
    }
    setSaving(false)
  }

  if (profile === undefined) return <Spinner />

  return (
    <div>
      <PageHeader title="Payouts" meta="Bank details, KYC and payout history" />

      <div className="mb-10 rounded-md border border-richblack-700 bg-richblack-800 p-6">
        <h2 className="mb-4 text-lg font-semibold text-richblack-5">Payout details</h2>

        {profile && (
          <p className="mb-4 text-sm">
            Status:{" "}
            <span
              className={
                profile.kycStatus === "verified"
                  ? "text-caribbeangreen-100"
                  : profile.kycStatus === "rejected"
                  ? "text-pink-200"
                  : "text-accent"
              }
            >
              {KYC_LABELS[profile.kycStatus]}
            </span>
            {profile.kycStatus === "rejected" && profile.kycRejectionReason && (
              <span className="ml-2 text-richblack-300">— {profile.kycRejectionReason}</span>
            )}
          </p>
        )}

        {profile && (
          <p className="mb-4 text-sm text-richblack-300">
            On file: {profile.bankAccountHolderName}, account {profile.bankAccountNumber}, IFSC{" "}
            {profile.ifscCode}
          </p>
        )}

        <p className="mb-4 text-xs text-richblack-400">
          Submitting new details resets verification — your payout profile will need to be
          re-reviewed before your next payout.
        </p>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <input
            required
            placeholder="Account holder name"
            value={form.bankAccountHolderName}
            onChange={(e) => setForm({ ...form, bankAccountHolderName: e.target.value })}
            className="form-style"
          />
          <input
            required
            placeholder="Bank account number"
            value={form.bankAccountNumber}
            onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
            className="form-style"
          />
          <input
            required
            placeholder="IFSC code"
            value={form.ifscCode}
            onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
            className="form-style"
          />
          <input
            required
            placeholder="PAN number"
            value={form.panNumber}
            onChange={(e) => setForm({ ...form, panNumber: e.target.value })}
            className="form-style"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-fit rounded-md bg-yellow-50 px-6 py-2 font-semibold text-on-signal disabled:opacity-60"
          >
            {saving ? "Saving..." : profile ? "Update details" : "Submit details"}
          </button>
        </form>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-richblack-5">Payout history</h2>
      {!payouts ? (
        <Spinner />
      ) : payouts.length === 0 ? (
        <p className="text-richblack-300">No payouts yet.</p>
      ) : (
        <Table className="rounded-md border border-richblack-700">
          <Thead>
            <Tr className="border-b border-richblack-700 text-left text-richblack-50">
              <Th className="px-4 py-3">Period</Th>
              <Th className="px-4 py-3">Gross</Th>
              <Th className="px-4 py-3">Platform fee</Th>
              <Th className="px-4 py-3">Net</Th>
              <Th className="px-4 py-3">Status</Th>
              <Th className="px-4 py-3">Paid</Th>
            </Tr>
          </Thead>
          <Tbody>
            {payouts.map((payout) => (
              <Tr key={payout._id} className="border-b border-richblack-800 text-richblack-100">
                <Td className="px-4 py-3">
                  {formatDate(payout.periodStart)} – {formatDate(payout.periodEnd)}
                </Td>
                <Td className="px-4 py-3">{formatCurrency(payout.grossAmount)}</Td>
                <Td className="px-4 py-3">{formatCurrency(payout.platformFeeAmount)}</Td>
                <Td className="px-4 py-3">{formatCurrency(payout.netAmount)}</Td>
                <Td className="px-4 py-3">
                  <span className={payout.status === "paid" ? "text-caribbeangreen-100" : "text-accent"}>
                    {payout.status}
                  </span>
                </Td>
                <Td className="px-4 py-3">{payout.paidAt ? formatDate(payout.paidAt) : "—"}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
