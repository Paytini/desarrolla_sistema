import { redirect } from "next/navigation"
import { Box, Paper, Stack, Typography } from "@mui/material"
import { getSuperadminEmpresasSnapshot, getSuperadminReportesSnapshot } from "@/lib/dashboard-cache"
import { getSession } from "@/lib/session"
import { checkAndNotifyExpiringPackages } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"
import { ActivityFeed } from "@/components/superadmin/ActivityFeed"
import { DashboardGreeting } from "@/components/superadmin/DashboardGreeting"
import { LearningActivityChart, type ActivityPoint, type ActivitySeries } from "@/components/superadmin/LearningActivityChart"
import { QuickActions } from "@/components/superadmin/QuickActions"
import { SectionCard } from "@/components/shared/SectionCard"
import KpiCard from "@/components/shared/KpiCard"
import { OcupacionCard } from "@/components/superadmin/OcupacionCard"
import { RenewalsTable } from "@/components/superadmin/RenewalsTable"

const DAY_MS = 1000 * 60 * 60 * 24

function DonutChart({
  segments,
  size = 130,
  sw = 14,
}: {
  segments: { value: number; color: string; label: string }[]
  size?: number
  sw?: number
}) {
  const cx      = size / 2
  const r       = (size - sw) / 2
  const circ    = 2 * Math.PI * r
  const total   = segments.reduce((s, g) => s + g.value, 0)
  const GAP     = total > 0 ? 3 : 0
  const numSize = Math.round(size * 0.165)
  const subSize = Math.round(size * 0.072)
  let cum       = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E2E8F0" strokeWidth={sw} />
      {total > 0 && (() => {
        const SWEEP_MS  = 900
        const BASE_DELAY = 150
        return segments.map((seg, i) => {
          const len      = (seg.value / total) * circ - GAP
          const offset   = circ / 4 - (cum / total) * circ
          const segStart = cum
          cum += seg.value
          const delayMs = BASE_DELAY + Math.round((segStart / total) * SWEEP_MS)
          const durMs   = Math.round((seg.value / total) * SWEEP_MS)
          const lenNorm    = len / circ
          const offsetNorm = offset / circ
          return len > 0 ? (
            <circle key={i} cx={cx} cy={cx} r={r} fill="none"
              stroke={seg.color} strokeWidth={sw} strokeLinecap="butt"
              pathLength={1}
              strokeDasharray={`${lenNorm} ${1 - lenNorm}`}
              className="donut-draw-in"
              style={{
                "--donut-offset-start": offsetNorm + lenNorm,
                "--donut-offset-final": offsetNorm,
                animationDelay: `${delayMs}ms`,
                animationDuration: `${durMs}ms`,
              } as React.CSSProperties} />
          ) : null
        })
      })()}
      <text x={cx} y={cx + numSize * 0.35} textAnchor="middle" fill="#1E293B" fontSize={numSize} fontWeight="800" fontFamily="var(--font-outfit, Outfit), system-ui">{total}</text>
      <text x={cx} y={cx + numSize * 0.35 + subSize + 4} textAnchor="middle" fill="#64748B" fontSize={subSize}>cursos total</text>
    </svg>
  )
}


function CompanyProgressKpi({
  globalAvg,
}: {
  globalAvg: number
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '16px',
        backgroundColor: 'var(--kpi-bg, #111827)',
        border: '1px solid var(--kpi-border, transparent)',
        boxShadow: 'var(--kpi-shadow, none)',
        overflow: 'hidden',
        transition: 'transform 200ms',
        '&:hover': { transform: 'scale(1.02)' },
      }}
    >
      <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--kpi-text-secondary, rgba(255,255,255,0.55))', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
          Progreso por empresa
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.75 }}>
          <Typography sx={{
            fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)',
            fontSize: '2rem', fontWeight: 800, lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums', color: 'var(--kpi-text, #FFFFFF)',
          }}>
            {globalAvg}%
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'var(--kpi-text-secondary, rgba(255,255,255,0.55))' }}>
            promedio global
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}

export default async function SuperadminDashboardPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  await checkAndNotifyExpiringPackages().catch(() => {})

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()

  const [{ empresas }, { empresas: empresasConCursos }, recentEvents] = await Promise.all([
    getSuperadminEmpresasSnapshot(),
    getSuperadminReportesSnapshot(),
    prisma.auditoriaEvento.findMany({
      orderBy: { created_at: "desc" },
      take: 12,
      select: { id: true, actor_nombre: true, actor_rol: true, accion: true, entidad_tipo: true, resumen: true, created_at: true },
    }),
  ])

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

  const allCursos   = empresasConCursos.flatMap((e) => e.empleados.flatMap((emp) => emp.cursos))
  const completados = allCursos.filter((c) => c.completado).length
  const enProgreso  = allCursos.filter((c) => !c.completado && c.progreso_pct > 0).length
  const sinIniciar  = allCursos.filter((c) => c.progreso_pct === 0).length
  const totalCursos = allCursos.length

  const rankingEmpresas = empresasConCursos
    .map((e) => {
      const cursos = e.empleados.flatMap((emp) => emp.cursos)
      const avg    = cursos.length ? Math.round(cursos.reduce((s, c) => s + c.progreso_pct, 0) / cursos.length) : 0
      return { nombre: e.nombre, avg }
    })
    .filter((e) => e.avg > 0 || empresasConCursos.find((ec) => ec.nombre === e.nombre)?.empleados.length)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 6)

  const globalAvg = rankingEmpresas.length
    ? Math.round(rankingEmpresas.reduce((s, e) => s + e.avg, 0) / rankingEmpresas.length)
    : 0

  const ACTIVITY_DAYS = 14
  const COMPANY_LINE_COLORS = ["#3579F5", "#161B23", "rgba(53,121,245,0.5)", "rgba(22,27,35,0.4)", "#8AB4F8"]

  const activityDayKeys = Array.from({ length: ACTIVITY_DAYS }, (_, i) =>
    new Date(now - (ACTIVITY_DAYS - 1 - i) * DAY_MS).toISOString().slice(0, 10)
  )

  const empresaActivitySeries: ActivitySeries[] = empresasConCursos.map((e, i) => {
    const dayCounts = new Map<string, number>()
    e.empleados.forEach((emp) => {
      emp.cursos.forEach((c) => {
        const key = new Date(c.ultima_sincronizacion).toISOString().slice(0, 10)
        if (activityDayKeys.includes(key)) dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
      })
    })
    return {
      nombre: e.nombre,
      color: COMPANY_LINE_COLORS[i % COMPANY_LINE_COLORS.length],
      data: activityDayKeys.map((day) => ({ day, value: dayCounts.get(day) ?? 0 })),
    }
  })

  const globalActivitySeries: ActivityPoint[] = activityDayKeys.map((day, i) => ({
    day,
    value: empresaActivitySeries.reduce((s, series) => s + series.data[i].value, 0),
  }))

  return (
    <Stack spacing={3}>

      <DashboardGreeting nombre={session.user.nombre as string} />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
        <Box className="kpi-animate" sx={{ display: "flex" }}>
          <KpiCard label="Empresas activas"   value={empresasActivas}       sub={`de ${empresas.length} registradas`}                                 borderColor="emerald" ring={empresasPct} />
        </Box>
        <Box className="kpi-animate" sx={{ display: "flex" }}>
          <KpiCard label="Empleados en LMS"   value={totalEmpleadosActivos} sub={`de ${totalContratados} cupos contratados`}                          borderColor="violet"  ring={empleadosPct} />
        </Box>
        <Box className="kpi-animate" sx={{ display: "flex" }}>
          <KpiCard label="Ocupación de cupos" value={`${ocupacionPct}%`}    sub={`${totalUsados} usados · ${totalContratados - totalUsados} libres`} borderColor="amber"   ring={ocupacionPct}    alert={ocupacionPct >= 90} />
        </Box>
        <Box className="kpi-animate" sx={{ display: "flex" }}>
          <CompanyProgressKpi globalAvg={globalAvg} />
        </Box>
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>

        <SectionCard title="Estado de aprendizaje">
          <Stack direction="row" spacing={4} sx={{ alignItems: "center", height: "100%" }}>
            <Box sx={{ flexShrink: 0 }}>
              <DonutChart size={200} sw={22} segments={[
                { value: completados, color: "#34D399", label: "Completados" },
                { value: enProgreso,  color: "#8B5CF6", label: "En progreso" },
                { value: sinIniciar,  color: "#F1F5F9", label: "Sin iniciar" },
              ]} />
            </Box>
            <Stack spacing={3} sx={{ flex: 1, minWidth: 0 }}>
              {[
                { label: "Completados", value: completados, color: "#34D399" },
                { label: "En progreso", value: enProgreso,  color: "#8B5CF6" },
                { label: "Sin iniciar", value: sinIniciar,  color: "#CBD5E1" },
              ].map((s) => (
                <Box key={s.label}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 0.75 }}>
                    <Box sx={{ width: 12, height: 12, flexShrink: 0, borderRadius: "50%", bgcolor: s.color }} />
                    <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 500, color: "text.secondary" }}>
                      {s.label}
                    </Typography>
                    <Typography sx={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "text.primary", fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)' }}>
                      {s.value}
                    </Typography>
                    {totalCursos > 0 && (
                      <Typography sx={{ width: 36, textAlign: "right", fontSize: 12, fontWeight: 500, color: "text.secondary" }}>
                        {Math.round((s.value / totalCursos) * 100)}%
                      </Typography>
                    )}
                  </Stack>
                  <Box sx={{ height: 5, borderRadius: 999, bgcolor: "#F1F5F9", overflow: "hidden" }}>
                    <Box sx={{ height: "100%", width: totalCursos > 0 ? `${Math.round((s.value / totalCursos) * 100)}%` : "0%", bgcolor: s.color, borderRadius: 999 }} />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Stack>
        </SectionCard>

        <LearningActivityChart global={globalActivitySeries} porEmpresa={empresaActivitySeries} />
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { lg: "1fr 280px" } }}>
        <ActivityFeed items={recentEvents} />
        <QuickActions />
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { lg: "1fr 300px" } }}>
        <OcupacionCard ocupacionPct={ocupacionPct} empresas={empresas} />
        <RenewalsTable renewals={renewals} />
      </Box>
    </Stack>
  )
}
