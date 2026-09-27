"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { toast } from "react-hot-toast"
import copy from "copy-to-clipboard"

import { fetchMyReferralCode, fetchMyReferrals } from "../../../services/operations/affiliateAPI"
import { formatDate } from "../../../services/formatDate"
import Button from "../../common/Button"
import Card from "../../common/Card"
import Spinner from "../../common/Spinner"

import type { RootState } from "../../../store"
import { PageHeader } from "../../common/DashKit"

/** Payload of GET /affiliate/my-referrals. */
interface AffiliateSummary {
  referralCode: string
  totalEarnedRupees: number
  referrals: {
    _id: string
    referredUser?: { firstName: string; lastName: string }
    commissionAmountRupees: number
    status: string
    createdAt: string
  }[]
}

export default function Affiliate() {
  const { token } = useSelector((state: RootState) => state.auth)
  const [code, setCode] = useState<string | null>(null)
  const [referrals, setReferrals] = useState<AffiliateSummary | null>(null)

  useEffect(() => {
    ;(async () => {
      const [codeResult, referralsResult] = await Promise.all([
        fetchMyReferralCode(token as string),
        fetchMyReferrals<AffiliateSummary>(token as string),
      ])
      setCode(codeResult)
      setReferrals(referralsResult)
    })()
  }, [token])

  const referralLink = code && typeof window !== "undefined" ? `${window.location.origin}/?ref=${code}` : ""

  const handleCopy = () => {
    copy(referralLink)
    toast.success("Referral link copied")
  }

  if (!referrals || !code) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Refer and earn" meta="Your referral code and commissions" />

      <Card padding="p-6" className="mb-10">
        <p className="text-sm text-richblack-300">Your referral link</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 truncate rounded-md bg-richblack-900 px-3 py-2 text-sm text-richblack-100">
            {referralLink}
          </code>
          <Button size="sm" onClick={handleCopy}>
            Copy link
          </Button>
        </div>
        <p className="mt-3 text-xs text-richblack-400">
          Earn a commission on every purchase made by someone who signs up through your link.
        </p>
      </Card>

      <Card padding="p-6" className="mb-10 w-fit">
        <p className="text-sm text-richblack-300">Total earned</p>
        <p className="mt-1 text-3xl font-bold text-caribbeangreen-100">
          ₹{referrals.totalEarnedRupees.toFixed(2)}
        </p>
      </Card>

      <h2 className="mb-4 text-xl font-semibold text-richblack-5">Referral history</h2>
      {referrals.referrals.length === 0 ? (
        <p className="text-richblack-400">No referrals yet — share your link to start earning.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {referrals.referrals.map((r) => (
            <Card key={r._id} padding="p-4" className="flex items-center justify-between">
              <div>
                <p className="text-richblack-5">
                  {r.referredUser?.firstName} {r.referredUser?.lastName}
                </p>
                <p className="text-xs text-richblack-400">{formatDate(r.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-caribbeangreen-100">
                  ₹{r.commissionAmountRupees.toFixed(2)}
                </p>
                <p className="text-xs capitalize text-richblack-400">{r.status}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
