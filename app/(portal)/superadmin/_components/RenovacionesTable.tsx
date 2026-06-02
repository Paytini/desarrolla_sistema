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

function DaysBadge({ days }: { days: number }) {
  if (days < 0)
    return (
      <span className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold bg-rose-50 text-rose-600">
        Vencido
      </span>
    )
  if (days <= 7)
    return (
      <span className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold bg-amber-50 text-amber-600">
        {days}d
      </span>
    )
  return (
    <span className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold bg-slate-100 text-slate-500">
      {days}d
    </span>
  )
}

interface RenovacionesTableProps {
  renewals: Renewal[]
}

export function RenovacionesTable({ renewals }: RenovacionesTableProps) {
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const sorted = [...renewals]
    .sort((a, b) => sortDir === "asc" ? a.days - b.days : b.days - a.days)
    .slice(0, 5)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Renovaciones próximas
        </p>
        {renewals.length > 5 && (
          <Link href="/superadmin/reportes" className="text-[11px] font-semibold" style={{ color: "#F5853F" }}>
            Ver todos →
          </Link>
        )}
      </div>

      {renewals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 size={22} className="text-slate-200" />
          <p className="text-[12px] text-slate-400">Sin alertas de vencimiento</p>
        </div>
      ) : (
        <div className="space-y-0">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-300">
            <span>Empresa</span>
            <button
              onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
              className="flex items-center gap-0.5 hover:text-slate-400"
            >
              Días {sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          </div>
          {sorted.map(({ empresa, days }) => (
            <div
              key={empresa.id}
              className="flex items-center justify-between border-b border-slate-50 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium" style={{ color: "#130303" }}>
                  {empresa.nombre}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {empresa.paquetes[0]?.paquete.nombre ?? "Sin paquete"}
                </p>
              </div>
              <DaysBadge days={days} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
