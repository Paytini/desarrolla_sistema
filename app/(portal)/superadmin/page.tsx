import { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ActivityFeed } from "@/components/superadmin/ActivityFeed"
import { QuickActions } from "@/components/superadmin/QuickActions"
import { Card, CardContent } from "@/components/ui/card"
import { OcupacionCard } from "./_components/OcupacionCard"
import { RenovacionesTable } from "./_components/RenovacionesTable"
import { cn } from "@/lib/utils"

const DAY_MS = 1000 * 60 * 60 * 24

/* ── Mini ring chart (pure SVG, RSC-compatible) ─────────────────── */
function RingChart({
  pct,
  size = 56,
  sw = 6,
  color,
}: {
  pct: number
  size?: number
  sw?: number
  color: string
}) {
  const r      = (size - sw) / 2
  const circ   = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  const cx     = size / 2
  const cy     = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#0f172a" fontSize={11} fontWeight="700">
        {pct}%
      </text>
    </svg>
  )
}

/* ── Visual stat card with embedded ring chart ─────────────────── */
function VisualStatCard({
  label,
  value,
  sub,
  pct,
  color,
  alert = false,
}: {
  label: string
  value: string | number
  sub?: string
  pct: number
  color: string
  alert?: boolean
}) {
  return (
    <Card className={cn("overflow-hidden border-t-[3px]", alert ? "border-t-destructive" : "border-t-primary")}>
      <CardContent className="px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </p>
            <p className={cn(
              "mt-1.5 text-[32px] font-bold leading-none tabular-nums tracking-tight",
              alert ? "text-destructive" : "text-foreground"
            )}>
              {value}
            </p>
            {sub && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>
            )}
          </div>
          <RingChart pct={pct} color={alert ? "#ef4444" : color} />
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default async function SuperadminDashboardPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const [{ empresas }, recentEvents] = await Promise.all([
    getSuperadminEmpresasSnapshot(),
    prisma.auditoriaEvento.findMany({
      orderBy: { created_at: "desc" },
      take: 12,
      select: {
        id: true,
        actor_nombre: true,
        actor_rol: true,
        accion: true,
        entidad_tipo: true,
        resumen: true,
        created_at: true,
      },
    }),
  ])

  const now = Date.now()

  const empresasActivas       = empresas.filter((e) => e.activo).length
  const empresasPct           = empresas.length ? Math.round((empresasActivas / empresas.length) * 100) : 0

  const totalEmpleadosActivos = empresas.reduce((s, e) => s + e.empleados.filter((emp) => emp.activo).length, 0)
  const totalContratados      = empresas.reduce((s, e) => s + e.asientos_contratados, 0)
  const totalUsados           = empresas.reduce((s, e) => s + e.asientos_usados, 0)
  const ocupacionPct          = totalContratados ? Math.round((totalUsados / totalContratados) * 100) : 0
  const empleadosPct          = totalContratados ? Math.round((totalEmpleadosActivos / totalContratados) * 100) : 0

  const renewals = empresas
    .filter((e) => {
      const exp = e.paquetes[0]?.fecha_vencimiento
      if (!exp) return false
      return Math.floor((new Date(exp).getTime() - now) / DAY_MS) <= 30
    })
    .map((e) => ({
      empresa: e,
      days: Math.floor((new Date(e.paquetes[0]!.fecha_vencimiento as Date).getTime() - now) / DAY_MS),
    }))
    .sort((a, b) => a.days - b.days)

  const renovacionesPct = empresasActivas ? Math.round((renewals.length / empresasActivas) * 100) : 0

  return (
    <div className="space-y-6">

      {/* Visual overview — 4 chart cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <VisualStatCard
          label="Empresas activas"
          value={empresasActivas}
          sub={`de ${empresas.length} registradas`}
          pct={empresasPct}
          color="#22c55e"
        />
        <VisualStatCard
          label="Empleados en LMS"
          value={totalEmpleadosActivos}
          sub={`de ${totalContratados} cupos contratados`}
          pct={empleadosPct}
          color="#FF8F00"
        />
        <VisualStatCard
          label="Ocupación de cupos"
          value={`${ocupacionPct}%`}
          sub={`${totalUsados} usados · ${totalContratados - totalUsados} libres`}
          pct={ocupacionPct}
          color="#3b82f6"
          alert={ocupacionPct >= 90}
        />
        <VisualStatCard
          label="Renovaciones próximas"
          value={renewals.length}
          sub="empresas vencen en 30 días"
          pct={renovacionesPct}
          color="#f59e0b"
          alert={renewals.length > 0}
        />
      </div>

      {/* Main 2-column grid */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <ActivityFeed items={recentEvents} />
        <QuickActions />
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <OcupacionCard ocupacionPct={ocupacionPct} empresas={empresas} />
        <RenovacionesTable renewals={renewals} />
      </div>
    </div>
  )
}
