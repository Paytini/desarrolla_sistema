"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { SearchInput } from "@/components/shared/SearchInput"
import { fd } from "@/lib/theme-tokens"

type SelectOption = { value: string; label: string }

type SelectFilter = {
  name: string
  defaultValue: string
  initialValue: string
  options: SelectOption[]
  ariaLabel: string
}

type ListFiltersProps = {
  searchPlaceholder: string
  searchParamName?: string
  initialQuery: string
  selects?: SelectFilter[]
  extraQuery?: string
}

export function ListFilters({
  searchPlaceholder,
  searchParamName = "q",
  initialQuery,
  selects = [],
  extraQuery,
}: ListFiltersProps) {
  const router = useRouter()
  const basePath = usePathname()
  const [query, setQuery] = useState(initialQuery)
  const [selectValues, setSelectValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(selects.map((select) => [select.name, select.initialValue])),
  )
  const skipFirstRun = useRef(true)

  useEffect(() => {
    if (skipFirstRun.current) {
      skipFirstRun.current = false
      return
    }
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(extraQuery ?? "")
      if (query.trim()) params.set(searchParamName, query.trim())
      for (const select of selects) {
        const value = selectValues[select.name]
        if (value && value !== select.defaultValue) params.set(select.name, value)
      }
      const serialized = params.toString()
      router.replace(serialized ? `${basePath}?${serialized}` : basePath, { scroll: false })
    }, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectValues, basePath, extraQuery, searchParamName, router])

  const hasActiveFilters =
    query.trim() !== "" ||
    selects.some((select) => selectValues[select.name] !== select.defaultValue)

  return (
    <div className="flex flex-wrap items-center gap-1">
      <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} width={224} />
      {selects.map((select) => (
        <select
          key={select.name}
          value={selectValues[select.name] ?? select.defaultValue}
          onChange={(e) =>
            setSelectValues((prev) => ({ ...prev, [select.name]: e.target.value }))
          }
          aria-label={select.ariaLabel}
          style={{
            height: 40,
            borderRadius: "8px",
            border: "1px solid var(--portal-border)",
            background: fd.background,
            padding: "0 12px",
            fontSize: "13px",
            color: fd.foreground,
            outline: "none",
            cursor: "pointer",
          }}
        >
          {select.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}
      {hasActiveFilters ? (
        <button
          type="button"
          onClick={() => {
            setQuery("")
            setSelectValues(Object.fromEntries(selects.map((s) => [s.name, s.defaultValue])))
          }}
          aria-label="Limpiar filtros"
          className="inline-flex size-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={16} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  )
}
