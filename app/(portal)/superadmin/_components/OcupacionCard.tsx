// app/(portal)/superadmin/_components/OcupacionCard.tsx

function RingChart({ pct }: { pct: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  const color = pct >= 90 ? "#f43f5e" : pct >= 70 ? "#f59e0b" : "#F5853F"
  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 88 88" className="size-[88px] -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle
          cx="44" cy="44" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-[18px] font-bold leading-none" style={{ color: "#130303" }}>{pct}%</p>
        <p className="text-[9px] text-slate-400 mt-0.5">global</p>
      </div>
    </div>
  )
}

function CompanyBar({ nombre, usados, contratados }: { nombre: string; usados: number; contratados: number }) {
  const pct = contratados ? Math.round((usados / contratados) * 100) : 0
  const color = pct >= 90 ? "#f43f5e" : pct >= 70 ? "#f59e0b" : "#F5853F"
  return (
    <div className="flex items-center gap-3">
      <p className="w-32 shrink-0 truncate text-[12px] text-slate-600">{nombre}</p>
      <div className="flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <p className="w-10 shrink-0 text-right text-[11px] tabular-nums text-slate-400">
        {usados}/{contratados}
      </p>
    </div>
  )
}

interface OcupacionCardProps {
  ocupacionPct: number
  empresas: Array<{ id: number; nombre: string; asientos_usados: number; asientos_contratados: number }>
}

export function OcupacionCard({ ocupacionPct, empresas }: OcupacionCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-[13px] font-semibold" style={{ color: "#130303" }}>Ocupación de cupos</p>
        <p className="text-[12px] text-slate-400">Cupos usados vs contratados</p>
      </div>
      <div className="p-5">
        {empresas.length === 0 ? (
          <p className="text-center text-sm text-slate-400">Sin empresas registradas.</p>
        ) : (
          <div className="flex items-start gap-5">
            <div className="shrink-0">
              <RingChart pct={ocupacionPct} />
            </div>
            <div className="flex-1 space-y-3 pt-1">
              {empresas.slice(0, 6).map((e) => (
                <CompanyBar
                  key={e.id}
                  nombre={e.nombre}
                  usados={e.asientos_usados}
                  contratados={e.asientos_contratados}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
