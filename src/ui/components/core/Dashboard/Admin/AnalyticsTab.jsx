"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"

import { fetchAnalyticsOverview } from "../../../../services/operations/adminAPI"
import { formatCurrency } from "../../../../utils/formatCurrency"
import Spinner from "../../../common/Spinner"
import Card from "../../../common/Card"

function Stat({ label, value }) {
  return (
    <Card padding="p-5">
      <p className="text-sm text-richblack-300">{label}</p>
      <p className="mt-1 text-2xl font-bold text-richblack-5">{value}</p>
    </Card>
  )
}

export default function AnalyticsTab() {
  const { token } = useSelector((state) => state.auth)
  const [data, setData] = useState(null)

  useEffect(() => {
    ;(async () => {
      setData(await fetchAnalyticsOverview(token))
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!data) return <Spinner />

  const { funnel } = data

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total revenue" value={formatCurrency(data.revenueTotalRupees)} />
        <Stat label="Completion rate" value={`${data.completionRate}%`} />
        <Stat label="Refund rate" value={`${data.refundRate}%`} />
        <Stat label="AI interactions" value={data.aiInteractionCount} />
      </div>

      <Card padding="p-5" className="mb-6">
        <h3 className="mb-4 font-semibold text-richblack-5">Conversion funnel (last 30 days)</h3>
        <div className="flex items-end gap-8">
          {[
            { label: "Viewed", value: funnel.viewed },
            { label: "Checkout started", value: funnel.checkoutStarted },
            { label: "Purchased", value: funnel.purchased },
          ].map((step) => (
            <div key={step.label} className="text-center">
              <div
                className="mx-auto w-16 rounded-t bg-yellow-50"
                style={{ height: `${Math.max(8, Math.min(120, step.value))}px` }}
              />
              <p className="mt-2 text-sm text-richblack-100">{step.value}</p>
              <p className="text-xs text-richblack-400">{step.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="p-5">
        <h3 className="mb-4 font-semibold text-richblack-5">Top courses by revenue</h3>
        <div className="flex flex-col gap-2">
          {data.topCourses.length === 0 ? (
            <p className="text-sm text-richblack-400">No sales yet.</p>
          ) : (
            data.topCourses.map((course) => (
              <div key={course._id} className="flex items-center justify-between text-sm">
                <span className="text-richblack-100">{course.courseName}</span>
                <span className="text-richblack-300">
                  {formatCurrency(course.revenue)} · {course.sales} sale(s)
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
