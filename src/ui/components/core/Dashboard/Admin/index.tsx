"use client"

import { useState } from "react"

import { PageHeader } from "../../../common/DashKit"

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
      <PageHeader title="Admin" meta={`${TABS.find((t) => t.id === activeTab)?.label}`} />
      <div role="tablist" aria-label="Admin sections" className="-mt-6 mb-10 flex overflow-x-auto border-b border-richblack-600 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`stamp -mb-px shrink-0 border-b-2 px-4 py-3 transition-colors ${
              activeTab === tab.id
                ? "border-accent text-richblack-5"
                : "border-transparent text-richblack-400 hover:text-richblack-5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div key={activeTab} role="tabpanel" className="fade-in">
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
    </div>
  )
}
