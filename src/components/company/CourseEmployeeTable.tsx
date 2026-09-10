"use client"

import { useMemo, useState } from "react"
import { Eye, Search, X } from "lucide-react"
import Tooltip from "@mui/material/Tooltip"
import Link from "next/link"
import EmptyState from "@/components/shared/EmptyState"
import { DataTable } from "@/components/shared/DataTable"
import ProgressBar from "@/components/shared/ProgressBar"
import { StatusLabel } from "@/components/shared/StatusLabel"
import { companyPath } from "@/lib/company/routes"

export type CourseEmployeeRow = {
  id: string
  progressPct: number
  completed: boolean
  quizScorePct: number | null
  employee: {
    id: string
    firstName: string
    lastName: string
    department: string | null
    position: string | null
  }
}

type RowStatus = "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED"

const ROW_STATUS_VARIANT: Record<RowStatus, "green" | "amber" | "slate"> = {
  COMPLETED: "green",
  IN_PROGRESS: "amber",
  NOT_STARTED: "slate",
}

const ROW_STATUS_LABEL: Record<RowStatus, string> = {
  COMPLETED: "Completado",
  IN_PROGRESS: "En curso",
  NOT_STARTED: "Sin iniciar",
}

function rowStatus(row: CourseEmployeeRow): RowStatus {
  if (row.completed) return "COMPLETED"
  if (row.progressPct > 0) return "IN_PROGRESS"
  return "NOT_STARTED"
}

const TABLE_PAGE_SIZE = 10

export function CourseEmployeeTable({ rows, slug }: { rows: CourseEmployeeRow[]; slug: string }) {
  const [search, setSearch] = useState("")

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      `${row.employee.firstName} ${row.employee.lastName}`.toLowerCase().includes(q),
    )
  }, [rows, search])

  return (
    <section className="rounded-lg bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">
          Progreso por empleado
          <span className="ml-2 text-sm font-normal text-slate-400">{rows.length}</span>
        </h2>
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empleado..."
            className="w-56 rounded-lg border border-portal-border py-2 pl-8 pr-8 text-sm outline-none transition focus:border-portal-blue"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="Aún no hay empleados asignados a este curso." />
      ) : filteredRows.length === 0 ? (
        <EmptyState message={`Sin resultados para "${search}".`} />
      ) : (
        <DataTable
          ariaLabel="Progreso por empleado"
          pageSize={TABLE_PAGE_SIZE}
          columns={[
            { label: "Empleado" },
            { label: "Departamento" },
            { label: "Puesto" },
            { label: "Avance" },
            { label: "Estado" },
            { label: "Resultado del examen final" },
            { label: "" },
          ]}
          rows={filteredRows.map((row) => {
            const status = rowStatus(row)
            return (
              <tr key={row.id} className="bg-gray-50">
                <td className="min-w-0 rounded-l-lg py-3 pl-4">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {row.employee.firstName} {row.employee.lastName}
                  </p>
                </td>
                <td className="truncate px-4 py-3 text-sm text-slate-500">
                  {row.employee.department ?? "—"}
                </td>
                <td className="truncate px-4 py-3 text-sm text-slate-500">
                  {row.employee.position ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={row.progressPct} className="w-24" />
                    <span className="w-9 shrink-0 text-sm tabular-nums text-slate-700">
                      {row.progressPct}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusLabel
                    status={status}
                    variantMap={ROW_STATUS_VARIANT}
                    labelMap={ROW_STATUS_LABEL}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {row.quizScorePct !== null ? (
                    <span className="font-semibold tabular-nums">{row.quizScorePct}%</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="rounded-r-lg py-3 pr-4 text-right">
                  <Tooltip title="Ver perfil">
                    <Link
                      href={companyPath(slug, `/employees/${row.employee.id}`)}
                      aria-label={`Ver perfil de ${row.employee.firstName} ${row.employee.lastName}`}
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] text-slate-500 transition hover:bg-gray-100 hover:text-slate-700"
                    >
                      <Eye size={18} strokeWidth={2} />
                    </Link>
                  </Tooltip>
                </td>
              </tr>
            )
          })}
        />
      )}
    </section>
  )
}
