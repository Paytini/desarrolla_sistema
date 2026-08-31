"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

type EmployeeListFiltersProps = {
  basePath: string
  initialQuery: string
  initialStatus: string
}

export default function EmployeeListFilters({
  basePath,
  initialQuery,
  initialStatus,
}: EmployeeListFiltersProps) {
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
      const serialized = params.toString()
      router.replace(serialized ? `${basePath}?${serialized}` : basePath, { scroll: false })
    }, 300)
    return () => clearTimeout(timeout)
  }, [query, status, basePath, router])

  const hasActiveFilters = query.trim() !== "" || status !== "all"

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Nombre, correo, área o puesto..."
        aria-label="Buscar empleados"
        className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-portal-blue"
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        aria-label="Filtrar por estado"
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-portal-blue"
      >
        <option value="all">Todos</option>
        <option value="active">Activos</option>
        <option value="inactive">Suspendidos</option>
      </select>
      {hasActiveFilters ? (
        <button
          type="button"
          onClick={() => {
            setQuery("")
            setStatus("all")
          }}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Limpiar
        </button>
      ) : null}
    </div>
  )
}
