"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState, type ReactNode } from "react"

type PaginatedTableColumn = {
  label: ReactNode
  className?: string
}

type PaginatedTableProps = {
  columns: PaginatedTableColumn[]
  rows: ReactNode[]
  pageSize: number
  ariaLabel: string
}

export function PaginatedTable({ columns, rows, pageSize, ariaLabel }: PaginatedTableProps) {
  const [page, setPage] = useState(0)

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, totalPages - 1)
  const start = currentPage * pageSize
  const visibleRows = rows.slice(start, start + pageSize)

  return (
    <div className="overflow-x-auto">
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

      {totalPages > 1 ? (
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
