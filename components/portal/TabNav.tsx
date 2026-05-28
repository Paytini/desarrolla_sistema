"use client"

import { useState } from "react"

type Tab = { label: string; value: string }

type TabNavProps = {
  tabs: Tab[]
  defaultValue?: string
  onChange?: (value: string) => void
}

export default function TabNav({ tabs, defaultValue, onChange }: TabNavProps) {
  const [active, setActive] = useState(defaultValue ?? tabs[0]?.value ?? "")

  function handleClick(value: string) {
    setActive(value)
    onChange?.(value)
  }

  return (
    <div className="flex gap-1 rounded-[10px] border border-[#f0f0f0] bg-[#f8fafc] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => handleClick(tab.value)}
          className={`rounded-[7px] px-4 py-1.5 text-[13px] font-semibold transition-all ${
            active === tab.value
              ? "bg-white text-[#1a1a1a] shadow-sm"
              : "text-[#64748b] hover:text-[#1a1a1a]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
