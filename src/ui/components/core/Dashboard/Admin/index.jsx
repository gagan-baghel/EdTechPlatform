"use client"

import { useState } from "react"

import UsersTab from "./UsersTab"
import CoursesTab from "./CoursesTab"
import PaymentsTab from "./PaymentsTab"
import PayoutsTab from "./PayoutsTab"
import RefundsTab from "./RefundsTab"
import CouponsTab from "./CouponsTab"
import AuditLogTab from "./AuditLogTab"
import FeatureFlagsTab from "./FeatureFlagsTab"
import HealthTab from "./HealthTab"
import AnalyticsTab from "./AnalyticsTab"

const TABS = [
  { id: "analytics", label: "Analytics" },
  { id: "users", label: "Users" },
  { id: "courses", label: "Courses" },
  { id: "payments", label: "Payments & Orders" },
  { id: "payouts", label: "Instructor Payouts" },
  { id: "refunds", label: "Refunds" },
  { id: "coupons", label: "Coupons" },
  { id: "audit", label: "Audit Log" },
  { id: "flags", label: "Feature Flags" },
  { id: "health", label: "System Health" },
]

export default function Admin() {
  const [activeTab, setActiveTab] = useState("analytics")

  return (
    <div>
      <h1 className="mb-8 text-3xl font-medium text-richblack-5">Admin</h1>
      <div className="mb-8 flex flex-wrap gap-2 border-b border-richblack-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border-b-2 border-yellow-50 text-yellow-50"
                : "text-richblack-300 hover:text-richblack-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "analytics" && <AnalyticsTab />}
      {activeTab === "users" && <UsersTab />}
      {activeTab === "courses" && <CoursesTab />}
      {activeTab === "payments" && <PaymentsTab />}
      {activeTab === "payouts" && <PayoutsTab />}
      {activeTab === "refunds" && <RefundsTab />}
      {activeTab === "coupons" && <CouponsTab />}
      {activeTab === "audit" && <AuditLogTab />}
      {activeTab === "flags" && <FeatureFlagsTab />}
      {activeTab === "health" && <HealthTab />}
    </div>
  )
}
