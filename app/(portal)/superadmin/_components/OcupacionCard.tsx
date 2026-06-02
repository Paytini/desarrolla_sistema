// app/(portal)/superadmin/_components/OcupacionCard.tsx

function RingChart({ pct, label }: { pct: number; label: string }) {
  const r = 34
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  const color = pct >= 90 ? "#f43f5e" : pct >= 70 ? "#f59e0b" : "#F5853F"
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 84 84" className="size-20">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
        <circle
          cx="42" cy="42" r={r} fill="none"
          stroke={color} strokeWidth="9"
          strokeDasharray={`${circ}`} strokeDashoffset={`${offset}`}
          strokeLinecap="round" transform="rotate(-90 42 42)"
        />
        <text x="42" y="46" textAnchor="middle" fontSize="15" fontWeight="700" fill="#130303">
          {pct}%
        </text>
      </svg>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  )
}

function CompanyBar({ nombre, usados, contratados }: { nombre: string; usados: number; contratados: number }) {
  const pct = contratados ? Math.round((usados / contratados) * 100) : 0
  const color = pct >= 90 ? "#f43f5e" : pct >= 70 ? "#f59e0b" : "#F5853F"
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="max-w-[60%] truncate text-[12px] font-medium text-slate-700">{nombre}</p>
        <p className="text-[11px] text-slate-400">{usados}/{contratados}</p>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

interface OcupacionCardProps {
  ocupacionPct: number
  empresas: Array<{ id: number; nombre: string; asientos_usados: number; asientos_contratados: number }>
}

export function OcupacionCard({ ocupacionPct, empresas }: OcupacionCardProps) {
  return (
    <div>
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        Ocupación de cupos
      </p>
      <div className="flex items-center gap-8">
        <RingChart pct={ocupacionPct} label="Global" />
        <div className="min-w-0 flex-1 space-y-3">
          {empresas.slice(0, 6).map((e) => (
            <CompanyBar
              key={e.id}
              nombre={e.nombre}
              usados={e.asientos_usados}
              contratados={e.asientos_contratados}
            />
          ))}
          {empresas.length === 0 && (
            <p className="text-xs text-slate-400">Sin empresas registradas.</p>
          )}
        </div>
      </div>
    </div>
  )
}
