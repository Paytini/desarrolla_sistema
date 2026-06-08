import { getSuperadminEmpresasSnapshot, getSuperadminReportesSnapshot } from "@/lib/dashboard-cache"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ActivityFeed } from "@/components/superadmin/ActivityFeed"
import { QuickActions } from "@/components/superadmin/QuickActions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OcupacionCard } from "./_components/OcupacionCard"
import { RenovacionesTable } from "./_components/RenovacionesTable"
import { cn } from "@/lib/utils"

const DAY_MS = 1000 * 60 * 60 * 24

/* ─────────────────────────────────────────────────────────────────────────────
   CHART PRIMITIVES — pure SVG, RSC-safe
   ───────────────────────────────────────────────────────────────────────────── */

/** Multi-segment donut (up to 4 segments) */
function DonutChart({
  segments,
  size = 130,
  sw = 14,
}: {
  segments: { value: number; color: string; label: string }[]
  size?: number
  sw?: number
}) {
  const cx    = size / 2
  const r     = (size - sw) / 2
  const circ  = 2 * Math.PI * r
  const total = segments.reduce((s, g) => s + g.value, 0)
  const GAP   = total > 0 ? 3 : 0
  let cum     = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
      {total > 0 && segments.map((seg, i) => {
        const len    = (seg.value / total) * circ - GAP
        const offset = circ / 4 - (cum / total) * circ
        cum += seg.value
        return len > 0 ? (
          <circle key={i} cx={cx} cy={cx} r={r} fill="none"
            stroke={seg.color} strokeWidth={sw} strokeLinecap="butt"
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={offset} />
        ) : null
      })}
      <text x={cx} y={cx - 6}  textAnchor="middle" fill="#0f172a" fontSize={22} fontWeight="700">{total}</text>
      <text x={cx} y={cx + 12} textAnchor="middle" fill="#94a3b8" fontSize={9}>cursos total</text>
    </svg>
  )
}

/** Vertical bar chart for activity over time */
function ActivityBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-1" style={{ height: 80 }}>
      {data.map((d) => {
        const h = Math.round((d.value / max) * 100)
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full min-h-[3px] rounded-t"
              style={{ height: `${h}%`, background: d.value > 0 ? "#FF8F00" : "#f1f5f9" }}
            />
            <span className="text-[8px] text-muted-foreground leading-none">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   STAT CARD — ring chart embedded
   ───────────────────────────────────────────────────────────────────────────── */
function VisualStatCard({
  label, value, sub, pct, color, alert = false,
}: {
  label: string; value: string | number; sub?: string
  pct: number; color: string; alert?: boolean
}) {
  return (
    <Card className={cn("overflow-hidden border-t-[3px]", alert ? "border-t-destructive" : "border-t-primary")}>
      <CardContent className="px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
            <p className={cn("mt-1.5 text-[32px] font-bold leading-none tabular-nums tracking-tight",
              alert ? "text-destructive" : "text-foreground")}>{value}</p>
            {sub && <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>}
          </div>
          <RingChart pct={pct} color={alert ? "#ef4444" : color} />
        </div>
      </CardContent>
    </Card>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────────────────────────────────────── */
export default async function SuperadminDashboardPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const [{ empresas }, { empresas: empresasConCursos }, recentEvents, activityRaw] = await Promise.all([
    getSuperadminEmpresasSnapshot(),
    getSuperadminReportesSnapshot(),
    prisma.auditoriaEvento.findMany({
      orderBy: { created_at: "desc" },
      take: 12,
      select: { id: true, actor_nombre: true, actor_rol: true, accion: true, entidad_tipo: true, resumen: true, created_at: true },
    }),
    prisma.auditoriaEvento.findMany({
      where: { created_at: { gte: new Date(Date.now() - 14 * DAY_MS) } },
      select: { created_at: true },
      orderBy: { created_at: "asc" },
    }),
  ])

  const now = Date.now()

  /* ── KPI numbers ──────────────────────────────────────── */
  const empresasActivas       = empresas.filter((e) => e.activo).length
  const empresasPct           = empresas.length ? Math.round((empresasActivas / empresas.length) * 100) : 0
  const totalEmpleadosActivos = empresas.reduce((s, e) => s + e.empleados.filter((emp) => emp.activo).length, 0)
  const totalContratados      = empresas.reduce((s, e) => s + e.asientos_contratados, 0)
  const totalUsados           = empresas.reduce((s, e) => s + e.asientos_usados, 0)
  const ocupacionPct          = totalContratados ? Math.round((totalUsados / totalContratados) * 100) : 0
  const empleadosPct          = totalContratados ? Math.round((totalEmpleadosActivos / totalContratados) * 100) : 0

  const renewals = empresas
    .filter((e) => { const exp = e.paquetes[0]?.fecha_vencimiento; return exp && Math.floor((new Date(exp).getTime() - now) / DAY_MS) <= 30 })
    .map((e) => ({ empresa: e, days: Math.floor((new Date(e.paquetes[0]!.fecha_vencimiento as Date).getTime() - now) / DAY_MS) }))
    .sort((a, b) => a.days - b.days)
  const renovacionesPct = empresasActivas ? Math.round((renewals.length / empresasActivas) * 100) : 0

  /* ── E: Estado global de aprendizaje ─────────────────── */
  const allCursos   = empresasConCursos.flatMap((e) => e.empleados.flatMap((emp) => emp.cursos))
  const completados = allCursos.filter((c) => c.completado).length
  const enProgreso  = allCursos.filter((c) => !c.completado && c.progreso_pct > 0).length
  const sinIniciar  = allCursos.filter((c) => c.progreso_pct === 0).length
  const totalCursos = allCursos.length

  /* ── F: Ranking de progreso por empresa ──────────────── */
  const rankingEmpresas = empresasConCursos
    .map((e) => {
      const cursos = e.empleados.flatMap((emp) => emp.cursos)
      const avg    = cursos.length ? Math.round(cursos.reduce((s, c) => s + c.progreso_pct, 0) / cursos.length) : 0
      return { nombre: e.nombre, avg }
    })
    .filter((e) => e.avg > 0 || empresasConCursos.find((ec) => ec.nombre === e.nombre)?.empleados.length)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 6)

  /* ── G: Actividad de usuarios — últimos 14 días ──────── */
  const activityMap = new Map<string, number>()
  activityRaw.forEach((ev) => {
    const key = new Date(ev.created_at).toLocaleDateString("es-MX", { month: "short", day: "numeric" })
    activityMap.set(key, (activityMap.get(key) ?? 0) + 1)
  })
  const activityData = Array.from({ length: 14 }, (_, i) => {
    const d     = new Date(Date.now() - (13 - i) * DAY_MS)
    const label = d.toLocaleDateString("es-MX", { month: "short", day: "numeric" })
    return { label: d.getDate().toString(), value: activityMap.get(label) ?? 0 }
  })
  const totalEventos = activityRaw.length

  return (
    <div className="space-y-5">

      {/* Row 1 — 4 visual KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <VisualStatCard label="Empresas activas"    value={empresasActivas}          sub={`de ${empresas.length} registradas`}               pct={empresasPct}     color="#22c55e" />
        <VisualStatCard label="Empleados en LMS"    value={totalEmpleadosActivos}    sub={`de ${totalContratados} cupos contratados`}         pct={empleadosPct}    color="#FF8F00" />
        <VisualStatCard label="Ocupación de cupos"  value={`${ocupacionPct}%`}       sub={`${totalUsados} usados · ${totalContratados - totalUsados} libres`} pct={ocupacionPct} color="#3b82f6" alert={ocupacionPct >= 90} />
        <VisualStatCard label="Renovaciones"        value={renewals.length}          sub="empresas vencen en 30 días"                         pct={renovacionesPct} color="#f59e0b" alert={renewals.length > 0} />
      </div>

      {/* Row 2 — 3 analysis charts */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* E — Estado global de aprendizaje */}
        <Card>
          <CardHeader className="px-5 py-4 border-b border-border">
            <CardTitle className="text-[14px] font-medium">Estado de aprendizaje</CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <div className="flex items-center gap-6">
              <DonutChart size={130} sw={16} segments={[
                { value: completados, color: "#22c55e", label: "Completados" },
                { value: enProgreso,  color: "#FF8F00", label: "En progreso" },
                { value: sinIniciar,  color: "#e2e8f0", label: "Sin iniciar" },
              ]} />
              <div className="space-y-3 min-w-0">
                {[
                  { label: "Completados",  value: completados, color: "#22c55e" },
                  { label: "En progreso",  value: enProgreso,  color: "#FF8F00" },
                  { label: "Sin iniciar",  value: sinIniciar,  color: "#e2e8f0" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="min-w-0 truncate text-[12px] text-muted-foreground">{s.label}</span>
                    <span className="ml-auto tabular-nums text-[13px] font-semibold text-foreground">{s.value}</span>
                    {totalCursos > 0 && (
                      <span className="text-[10px] text-muted-foreground w-8 text-right">
                        {Math.round((s.value / totalCursos) * 100)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* F — Ranking de progreso por empresa */}
        <Card>
          <CardHeader className="px-5 py-4 border-b border-border">
            <CardTitle className="text-[14px] font-medium">Progreso por empresa</CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-5">
            {rankingEmpresas.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Sin datos de progreso.</p>
            ) : (
              <div className="space-y-3">
                {rankingEmpresas.map((e) => (
                  <div key={e.nombre}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-[12px] font-medium text-foreground">{e.nombre}</p>
                      <span className="shrink-0 tabular-nums text-[12px] font-semibold text-muted-foreground">{e.avg}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${e.avg}%`, background: e.avg >= 75 ? "#22c55e" : e.avg >= 40 ? "#FF8F00" : "#f59e0b" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* G — Actividad de usuarios */}
        <Card>
          <CardHeader className="px-5 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[14px] font-medium">Actividad en el portal</CardTitle>
              <span className="text-[11px] text-muted-foreground">{totalEventos} eventos · 14 días</span>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <ActivityBarChart data={activityData} />
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
              {[
                { label: "Hoy",         value: activityData[activityData.length - 1]?.value ?? 0 },
                { label: "Ayer",        value: activityData[activityData.length - 2]?.value ?? 0 },
                { label: "Esta semana", value: activityData.slice(-7).reduce((s, d) => s + d.value, 0) },
                { label: "Total",       value: totalEventos },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  <p className="text-[18px] font-bold tabular-nums text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Activity feed + Quick actions */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <ActivityFeed items={recentEvents} />
        <QuickActions />
      </div>

      {/* Row 4 — Ocupación + Renovaciones */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <OcupacionCard ocupacionPct={ocupacionPct} empresas={empresas} />
        <RenovacionesTable renewals={renewals} />
      </div>
    </div>
  )
}
