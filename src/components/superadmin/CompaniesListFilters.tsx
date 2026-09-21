"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { SearchInput } from "@/components/shared/SearchInput"
import { fd } from "@/lib/theme-tokens"

type CompaniesListFiltersProps = {
  basePath: string
  initialQuery: string
  initialStatus: string
  sort?: string
  dir?: string
}

export function CompaniesListFilters({
  basePath,
  initialQuery,
  initialStatus,
  sort,
  dir,
}: CompaniesListFiltersProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [status, setStatus] = useState(initialStatus)
  const skipFirstRun = useRef(true)

  useEffect(() => {
    if (skipFirstRun.current) {
      skipFirstRun.current = false
      return
    }
    const timeout = setTimeout(() => {
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())
      if (status !== "all") params.set("status", status)
      if (sort) params.set("sort", sort)
      if (dir) params.set("dir", dir)
      const serialized = params.toString()
      router.replace(serialized ? `${basePath}?${serialized}` : basePath, { scroll: false })
    }, 300)
    return () => clearTimeout(timeout)
  }, [query, status, basePath, sort, dir, router])

  return (
    <div className="flex flex-wrap items-center gap-1">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Buscar empresa o RFC…"
        width={224}
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        aria-label="Filtrar por estado"
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
        <option value="all">Todos</option>
        <option value="activa">Activas</option>
        <option value="suspendida">Suspendidas</option>
      </select>
    </div>
  )
}
