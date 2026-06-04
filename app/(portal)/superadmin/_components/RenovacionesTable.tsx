"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"

type Renewal = {
  empresa: {
    id: number
    nombre: string
    paquetes: Array<{
      paquete: { nombre: string }
      fecha_vencimiento: Date | null
    }>
  }
  days: number
}

function DayChip({ days }: { days: number }) {
  if (days < 0)
    return (
      <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
        Vencido
      </span>
    )
  if (days <= 7)
    return (
      <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
        {days}d
      </span>
    )
  return (
    <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
      {days}d
    </span>
  )
}

export function RenovacionesTable({ renewals }: { renewals: Renewal[] }) {
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const sorted = [...renewals]
    .sort((a, b) => sortDir === "asc" ? a.days - b.days : b.days - a.days)
    .slice(0, 6)

  return (
    <div style={{ overflow: "hidden", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#fff" }}>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
        <div>
          <p className="text-[14px] font-medium text-slate-900">Renovaciones</p>
          <p className="text-[12px] text-slate-400">Paquetes por vencer en 30 días</p>
        </div>
        {renewals.length > 6 && (
          <Link
            href="/superadmin/reportes"
            className="text-[11px] font-semibold hover:opacity-75" style={{ color: "#1a4f8a" }}
          >
            Ver todos →
          </Link>
        )}
      </div>

      {renewals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <CheckCircle2 size={20} className="text-slate-200" />
          <p className="text-[12px] text-slate-400">Sin alertas de vencimiento</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between border-b border-slate-50 px-6 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300">
              Empresa
            </span>
            <button
              onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
              className="flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300 transition-colors hover:text-slate-500"
            >
              Días {sortDir === "asc" ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {sorted.map(({ empresa, days }) => (
              <div
                key={empresa.id}
                className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-slate-50/50"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="truncate text-[13px] font-medium text-slate-900">
                    {empresa.nombre}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {empresa.paquetes[0]?.paquete.nombre ?? "Sin paquete"}
                  </p>
                </div>
                <DayChip days={days} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
