"use client"

import { Search } from "lucide-react"

type SelectOption = { value: string; label: string }

type FilterBarProps = {
  searchPlaceholder?: string
  selects?: { placeholder: string; options: SelectOption[] }[]
}

export default function FilterBar({ searchPlaceholder = "Buscar…", selects = [] }: FilterBarProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2">
        <Search size={15} strokeWidth={2} className="shrink-0 text-[#94a3b8]" />
        <input
          type="search"
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          className="flex-1 border-none bg-transparent text-[13.5px] text-[#1a1a1a] outline-none placeholder:text-[#cbd5e1]"
        />
      </div>
      {selects.map((s, i) => (
        <select
          key={i}
          aria-label={s.placeholder}
          className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-[13.5px] text-[#1a1a1a] outline-none"
        >
          <option value="">{s.placeholder}</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}
    </div>
  )
}
