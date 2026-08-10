"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { Table, Tbody, Td, Th, Thead, Tr } from "react-super-responsive-table"

import {
  fetchPayoutProfilesForReview,
  setKycStatus,
  generatePayoutRun,
  fetchPayoutRuns,
  markPayoutPaid,
} from "../../../../services/operations/payoutAPI"
import { formatCurrency } from "../../../../utils/formatCurrency"
import { formatDate } from "../../../../services/formatDate"
import Spinner from "../../../common/Spinner"

export default function PayoutsTab() {
  const { token } = useSelector((state) => state.auth)
  const [profiles, setProfiles] = useState(null)
  const [payouts, setPayouts] = useState(null)
  const [runForm, setRunForm] = useState({ instructorId: "", periodStart: "", periodEnd: "" })
  const [payReference, setPayReference] = useState({})

  const load = async () => {
    const [profileResult, payoutResult] = await Promise.all([
      fetchPayoutProfilesForReview(token),
      fetchPayoutRuns(token),
    ])
    if (profileResult) setProfiles(profileResult.data)
    if (payoutResult) setPayouts(payoutResult.data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleKyc = async (profileId, kycStatus) => {
    const reason = kycStatus === "rejected" ? prompt("Reason for rejection?") || "" : undefined
    await setKycStatus(token, profileId, kycStatus, reason)
    await load()
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    await generatePayoutRun(token, runForm)
    await load()
  }

  const handleMarkPaid = async (payoutId) => {
    const reference = payReference[payoutId]
    if (!reference) return
    await markPayoutPaid(token, payoutId, reference)
    setPayReference((prev) => ({ ...prev, [payoutId]: "" }))
    await load()
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-richblack-5">Instructor KYC</h2>
      {!profiles ? (
        <div className="mb-8 spinner" />
      ) : profiles.length === 0 ? (
        <p className="mb-8 text-richblack-300">No payout profiles submitted yet.</p>
      ) : (
        <Table className="mb-10 rounded-md border border-richblack-700">
          <Thead>
            <Tr className="border-b border-richblack-700 text-left text-richblack-50">
              <Th className="px-4 py-3">Instructor</Th>
              <Th className="px-4 py-3">Bank account</Th>
              <Th className="px-4 py-3">Status</Th>
              <Th className="px-4 py-3">Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {profiles.map((profile) => (
              <Tr key={profile._id} className="border-b border-richblack-800 text-richblack-100">
                <Td className="px-4 py-3">
                  {profile.instructor?.firstName} {profile.instructor?.lastName} ({profile.instructor?.email})
                </Td>
                <Td className="px-4 py-3">
                  {profile.bankAccountHolderName} — {profile.bankAccountNumber}
                </Td>
                <Td className="px-4 py-3">{profile.kycStatus}</Td>
                <Td className="px-4 py-3">
                  {profile.kycStatus !== "verified" && (
                    <button
                      type="button"
                      onClick={() => handleKyc(profile._id, "verified")}
                      className="mr-3 text-sm font-semibold text-caribbeangreen-100 underline"
                    >
                      Verify
                    </button>
                  )}
                  {profile.kycStatus !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => handleKyc(profile._id, "rejected")}
                      className="text-sm font-semibold text-pink-200 underline"
                    >
                      Reject
                    </button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <h2 className="mb-3 text-lg font-semibold text-richblack-5">Generate a payout run</h2>
      <form onSubmit={handleGenerate} className="mb-10 flex flex-wrap items-end gap-2">
        <input
          required
          placeholder="Instructor user id"
          value={runForm.instructorId}
          onChange={(e) => setRunForm({ ...runForm, instructorId: e.target.value })}
          className="form-style"
        />
        <label className="flex flex-col text-sm text-richblack-200">
          Period start
          <input
            required
            type="date"
            value={runForm.periodStart}
            onChange={(e) => setRunForm({ ...runForm, periodStart: e.target.value })}
            className="form-style mt-1"
          />
        </label>
        <label className="flex flex-col text-sm text-richblack-200">
          Period end
          <input
            required
            type="date"
            value={runForm.periodEnd}
            onChange={(e) => setRunForm({ ...runForm, periodEnd: e.target.value })}
            className="form-style mt-1"
          />
        </label>
        <button type="submit" className="rounded-md bg-yellow-50 px-4 py-2 font-semibold text-ink">
          Generate
        </button>
      </form>

      <h2 className="mb-3 text-lg font-semibold text-richblack-5">Payout runs</h2>
      {!payouts ? (
        <Spinner />
      ) : payouts.length === 0 ? (
        <p className="text-richblack-300">No payout runs yet.</p>
      ) : (
        <Table className="rounded-md border border-richblack-700">
          <Thead>
            <Tr className="border-b border-richblack-700 text-left text-richblack-50">
              <Th className="px-4 py-3">Instructor</Th>
              <Th className="px-4 py-3">Period</Th>
              <Th className="px-4 py-3">Net</Th>
              <Th className="px-4 py-3">Status</Th>
              <Th className="px-4 py-3">Mark paid</Th>
            </Tr>
          </Thead>
          <Tbody>
            {payouts.map((payout) => (
              <Tr key={payout._id} className="border-b border-richblack-800 text-richblack-100">
                <Td className="px-4 py-3">
                  {payout.instructor?.firstName} {payout.instructor?.lastName}
                </Td>
                <Td className="px-4 py-3">
                  {formatDate(payout.periodStart)} – {formatDate(payout.periodEnd)}
                </Td>
                <Td className="px-4 py-3">{formatCurrency(payout.netAmount)}</Td>
                <Td className="px-4 py-3">{payout.status}</Td>
                <Td className="px-4 py-3">
                  {payout.status === "pending" ? (
                    <div className="flex gap-2">
                      <input
                        placeholder="Transfer reference"
                        value={payReference[payout._id] || ""}
                        onChange={(e) =>
                          setPayReference((prev) => ({ ...prev, [payout._id]: e.target.value }))
                        }
                        className="form-style w-40"
                      />
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(payout._id)}
                        className="rounded-md bg-caribbeangreen-200 px-3 py-1 text-sm font-semibold text-ink"
                      >
                        Mark paid
                      </button>
                    </div>
                  ) : (
                    payout.transactionReference
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
