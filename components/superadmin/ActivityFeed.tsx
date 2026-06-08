import { formatDateTime } from "@/lib/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

export type AuditoriaItem = {
  id: number
  actor_nombre: string
  actor_rol: string
  accion: string
  entidad_tipo: string
  resumen: string
  created_at: Date
}

const ACCION_META: Record<
  string,
  { label: string; dotColor: string; bgColor: string; textColor: string }
> = {
  EMPRESA_CREADA:     { label: "Alta",       dotColor: "#16a34a", bgColor: "#f0fdf4", textColor: "#15803d" },
  EMPRESA_SUSPENDIDA: { label: "Suspensión", dotColor: "#dc2626", bgColor: "#fef2f2", textColor: "#dc2626" },
  EMPRESA_ACTIVADA:   { label: "Activación", dotColor: "#16a34a", bgColor: "#f0fdf4", textColor: "#15803d" },
  PAQUETE_ASIGNADO:   { label: "Paquete",    dotColor: "#1a4f8a", bgColor: "#eff4fb", textColor: "#1a4f8a" },
  CUPOS_ACTUALIZADOS: { label: "Cupos",      dotColor: "#1a4f8a", bgColor: "#eff4fb", textColor: "#1a4f8a" },
  EMPLEADO_CREADO:    { label: "Empleado",   dotColor: "#7c3aed", bgColor: "#f5f3ff", textColor: "#7c3aed" },
  EMPLEADO_SUSPENDIDO:{ label: "Baja",       dotColor: "#b45309", bgColor: "#fffbeb", textColor: "#b45309" },
}

const DEFAULT_META = { label: "Evento", dotColor: "#94a3b8", bgColor: "#f8fafc", textColor: "#64748b" }

export function ActivityFeed({ items }: { items: AuditoriaItem[] }) {
  return (
    <Card>
      <CardHeader className="px-5 py-4 border-b border-border">
        <CardTitle className="text-[14px] font-medium">Actividad reciente</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[360px]">
          {items.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-muted-foreground">
              Sin eventos registrados aún.
            </div>
          ) : (
            <div className="relative px-5 py-4">
              {/* Vertical timeline line */}
              <div
                className="absolute left-[28px] top-4 bottom-4 w-px"
                style={{ background: "#f1f5f9" }}
              />
              <div className="space-y-0">
                {items.map((item) => {
                  const meta = ACCION_META[item.accion] ?? DEFAULT_META
                  return (
                    <div key={item.id} className="relative flex items-start gap-4 py-2.5">
                      {/* Timeline dot */}
                      <div
                        className="relative z-10 mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-white"
                        style={{ border: `2px solid ${meta.dotColor}` }}
                      >
                        <div
                          className="size-[6px] rounded-full"
                          style={{ background: meta.dotColor }}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
                        {/* Event type chip */}
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                          style={{ background: meta.bgColor, color: meta.textColor }}
                        >
                          {meta.label}
                        </span>
                        {/* Description */}
                        <span className="text-[13px] text-foreground">
                          {item.resumen}
                        </span>
                        {/* Actor */}
                        <span className="text-[11px] text-muted-foreground">
                          · {item.actor_nombre}
                        </span>
                      </div>

                      {/* Timestamp */}
                      <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-muted-foreground">
                        {formatDateTime(item.created_at)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
