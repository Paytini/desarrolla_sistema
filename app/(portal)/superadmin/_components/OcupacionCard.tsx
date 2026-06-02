// app/(portal)/superadmin/_components/OcupacionCard.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeDasharray={`${circ}`}
          strokeDashoffset={`${offset}`}
          strokeLinecap="round"
          transform="rotate(-90 42 42)"
        />
        <text
          x="42"
          y="46"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill="#0f172a"
        >
          {pct}%
        </text>
      </svg>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  )
}

function CompanyBar({
  nombre,
  usados,
  contratados,
}: {
  nombre: string
  usados: number
  contratados: number
}) {
  const pct = contratados ? Math.round((usados / contratados) * 100) : 0
  const barColor =
    pct >= 90 ? "bg-rose-400" : pct >= 70 ? "bg-amber-400" : "bg-[#F5853F]"

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="max-w-[55%] truncate text-xs font-medium text-slate-700">
          {nombre}
        </p>
        <p className="text-xs text-slate-400">
          {usados}/{contratados}
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

interface OcupacionCardProps {
  ocupacionPct: number
  empresas: Array<{
    id: number
    nombre: string
    asientos_usados: number
    asientos_contratados: number
  }>
}

export function OcupacionCard({ ocupacionPct, empresas }: OcupacionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[15px]">Ocupación de cupos</CardTitle>
        <CardDescription>
          Cupos usados vs contratados por empresa.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              <p className="text-xs text-slate-400">
                Sin empresas registradas aún.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
