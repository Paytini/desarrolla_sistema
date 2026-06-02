// app/(portal)/superadmin/_components/RenovacionesTable.tsx
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
      <span className="inline-flex h-5 items-center rounded-md px-1.5 text-[10px] font-bold bg-rose-50 text-rose-500">
        Vencido
      </span>
    )
  if (days <= 7)
    return (
      <span className="inline-flex h-5 items-center rounded-md px-1.5 text-[10px] font-bold bg-amber-50 text-amber-600">
        {days}d
      </span>
    )
  return (
    <span className="inline-flex h-5 items-center rounded-md px-1.5 text-[10px] font-bold bg-slate-100 text-slate-500">
      {days}d
    </span>
  )
}

export function RenovacionesTable({ renewals }: { renewals: Renewal[] }) {
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const sorted = [...renewals]
    .sort((a, b) => sortDir === "asc" ? a.days - b.days : b.days - a.days)
    .slice(0, 5)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "#130303" }}>Renovaciones</p>
          <p className="text-[12px] text-slate-400">Paquetes que vencen en 30 días</p>
        </div>
        {renewals.length > 5 && (
          <Link href="/superadmin/reportes" className="text-[11px] font-semibold" style={{ color: "#F5853F" }}>
            Ver todos →
          </Link>
        )}
      </div>

      {renewals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <CheckCircle2 size={24} className="text-slate-200" />
          <p className="text-[12px] text-slate-400">Sin alertas de vencimiento</p>
        </div>
      ) : (
        <div className="px-5">
          <div className="flex items-center justify-between py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-300">
            <span>Empresa</span>
            <button
              onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
              className="flex items-center gap-0.5 hover:text-slate-400 transition-colors"
            >
              Días {sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          </div>
          {sorted.map(({ empresa, days }) => (
            <div
              key={empresa.id}
              className="flex items-center justify-between border-t border-slate-50 py-3"
            >
              <div className="min-w-0 flex-1 pr-3">
                <p className="truncate text-[13px] font-medium" style={{ color: "#130303" }}>
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
      )}
    </div>
  )
}
