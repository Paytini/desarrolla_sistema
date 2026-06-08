import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface OcupacionCardProps {
  ocupacionPct: number
  empresas: Array<{ id: number; nombre: string; asientos_usados: number; asientos_contratados: number }>
}

function HorizontalBar({ nombre, usados, contratados }: { nombre: string; usados: number; contratados: number }) {
  const pct = contratados ? Math.round((usados / contratados) * 100) : 0
  const barColor =
    pct >= 90 ? "#dc2626" :
    pct >= 70 ? "#d97706" :
    "#1a4f8a"

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[12px] text-slate-600">{nombre}</p>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] tabular-nums text-slate-400">{usados}/{contratados}</span>
          <span
            className="text-[11px] font-semibold tabular-nums"
            style={{ color: barColor, minWidth: "32px", textAlign: "right" }}
          >
            {pct}%
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  )
}

export function OcupacionCard({ ocupacionPct, empresas }: OcupacionCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 border-b border-border px-5 py-4">
        <div>
          <p className="text-[14px] font-medium text-foreground">Ocupación de cupos</p>
          <p className="text-[12px] text-muted-foreground">Cupos usados vs. contratados</p>
        </div>
        <div className="text-right">
          <p
            className="text-[36px] font-semibold leading-none tabular-nums"
            style={{ color: ocupacionPct >= 90 ? "#dc2626" : "#0f172a" }}
          >
            {ocupacionPct}%
          </p>
          <p className="text-[11px] text-muted-foreground">ocupación global</p>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {empresas.length === 0 ? (
          <p className="text-center text-[13px] text-muted-foreground">Sin empresas registradas.</p>
        ) : (
          <div className="space-y-4">
            {empresas.slice(0, 6).map((e) => (
              <HorizontalBar
                key={e.id}
                nombre={e.nombre}
                usados={e.asientos_usados}
                contratados={e.asientos_contratados}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
