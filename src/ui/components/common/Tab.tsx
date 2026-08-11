import React from "react"

export interface TabItem {
  id: string | number
  type: string
  tabName: string
}

export interface TabProps {
  tabData: TabItem[]
  field: string
  setField: (type: string) => void
}

export default function Tab({ tabData, field, setField }: TabProps): React.JSX.Element {
  return (
    <div className="my-6 flex w-full rounded-full border border-white/10 bg-richblack-900/70 p-1">
      {tabData.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setField(tab.type)}
          className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition-all duration-200 ${
            field === tab.type
              ? "bg-gradient-to-r from-[#c3ebfa] to-white text-ink shadow-[0_12px_30px_rgba(195,235,250,0.18)]"
              : "bg-transparent text-richblack-300 hover:text-richblack-5"
          }`}
        >
          {tab?.tabName}
        </button>
      ))}
    </div>
  )
}
