"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState, type ReactNode } from "react"
import EmptyState from "@/components/shared/EmptyState"

export type DataTableColumn = {
  label: ReactNode
  className?: string
}

export type DataTableEmptyState = {
  message: string
  description?: string
  icon?: ReactNode
}

type DataTableProps = {
  ariaLabel: string
  columns: DataTableColumn[]
  rows: ReactNode[]
  emptyState?: DataTableEmptyState
  pageSize?: number
  className?: string
}

export function DataTable({
  ariaLabel,
  columns,
  rows,
  emptyState,
  pageSize,
  className = "",
}: DataTableProps) {
  const [page, setPage] = useState(0)

  if (rows.length === 0) {
    if (!emptyState) return null

    return (
      <div className="px-3 py-2">
        <EmptyState
          icon={emptyState.icon}
          message={emptyState.message}
          description={emptyState.description}
        />
      </div>
    )
  }

  const totalPages = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1
  const currentPage = Math.min(page, totalPages - 1)
  const visibleRows = pageSize
    ? rows.slice(currentPage * pageSize, currentPage * pageSize + pageSize)
    : rows

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-separate border-spacing-y-2" aria-label={ariaLabel}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={`px-4 pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 ${column.className ?? ""}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{visibleRows}</tbody>
      </table>

      {pageSize && totalPages > 1 ? (
        <div className="flex items-center justify-between px-4 pt-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={currentPage === 0}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronLeft size={14} />
            Anterior
          </button>
          <span className="text-xs text-slate-400">
            Página {currentPage + 1} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            disabled={currentPage === totalPages - 1}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Siguiente
            <ChevronRight size={14} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
