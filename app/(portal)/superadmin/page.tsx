import { redirect } from "next/navigation"
import { Box, Paper, Stack, Typography } from "@mui/material"
import { getSuperadminEmpresasSnapshot, getSuperadminReportesSnapshot } from "@/lib/dashboard-cache"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ActivityFeed } from "@/components/superadmin/ActivityFeed"
import { QuickActions } from "@/components/superadmin/QuickActions"
import { SectionCard } from "@/components/shared/SectionCard"
import KpiCard from "@/components/shared/KpiCard"
import { OcupacionCard } from "@/components/superadmin/OcupacionCard"
import { RenovacionesTable } from "@/components/superadmin/RenovacionesTable"

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
      <text x={cx} y={cx + numSize * 0.35} textAnchor="middle" fill="#1E293B" fontSize={numSize} fontWeight="800" fontFamily="Outfit, system-ui">{total}</text>
      <text x={cx} y={cx + numSize * 0.35 + subSize + 4} textAnchor="middle" fill="#64748B" fontSize={subSize}>cursos total</text>
    </svg>
  )
}

function SparklineKpi({
  total,
  data,
}: {
  total: number
  data: { label: string; value: number }[]
}) {
  const W = 220, H = 56, padX = 4, padY = 6
  const vals = data.map((d) => d.value)
  const max  = Math.max(...vals, 1)
  const w    = W - padX * 2
  const h    = H - padY * 2
  const step = vals.length > 1 ? w / (vals.length - 1) : 0

  const pts = vals.map((v, i) => ({
    x: padX + i * step,
    y: padY + h - (v / max) * h,
  }))

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const fill = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${(padY + h).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padY + h).toFixed(1)} Z`

  return (
    <Paper
      elevation={0}
      className="pg-hover-lift"
      sx={{
        borderRadius: '16px',
        backgroundColor: '#3B82F6',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
          Actividad · 14 días
        </Typography>
        <Typography sx={{
          fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)',
          fontSize: '2rem', fontWeight: 800, lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
          color: '#FFFFFF', mb: 1.5,
        }}>
          {total}
        </Typography>
        <svg
          width={W} height={H}
          viewBox={`0 0 ${W} ${H}`}
          aria-hidden
          style={{ display: 'block', width: '100%', height: H }}
        >
          <path d={fill} fill="rgba(255,255,255,0.15)" />
          <path d={line} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={2.5} fill="rgba(255,255,255,0.9)" />
          ))}
        </svg>
        <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', mt: 0.75 }}>
          eventos en el portal
        </Typography>
      </Box>
    </Paper>
  )
}

function CompanyProgressKpi({
  empresas,
  globalAvg,
}: {
  empresas: { nombre: string; avg: number }[]
  globalAvg: number
}) {
  return (
    <Paper
      elevation={0}
      className="pg-hover-lift"
      sx={{
        borderRadius: '16px',
        backgroundColor: '#111827',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
          Progreso por empresa
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.75 }}>
          <Typography sx={{
            fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)',
            fontSize: '2rem', fontWeight: 800, lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums', color: '#FFFFFF',
          }}>
            {globalAvg}%
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>
            promedio global
          </Typography>
        </Box>
        <Stack spacing={1.25}>
          {empresas.slice(0, 5).map((e) => (
            <Box key={e.nombre} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{
                fontSize: 10, color: 'rgba(255,255,255,0.6)',
                width: 64, flexShrink: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {e.nombre}
              </Typography>
              <Box sx={{ flex: 1, height: 6, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <Box sx={{
                  height: '100%',
                  width: `${e.avg}%`,
                  borderRadius: 999,
                  bgcolor: e.avg >= 75 ? '#34D399' : e.avg >= 40 ? '#A78BFA' : '#FBBF24',
                }} />
              </Box>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF', width: 26, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {e.avg}%
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Paper>
  )
}

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

  const empresasChart = empresas
    .filter((e) => e.activo && e.asientos_contratados > 0)
    .sort((a, b) => (b.asientos_usados / b.asientos_contratados) - (a.asientos_usados / a.asientos_contratados))
    .slice(0, 8)
    .map((e) => ({
      nombre:  e.nombre,
      usados:  e.asientos_usados,
      total:   e.asientos_contratados,
      pct:     Math.round((e.asientos_usados / e.asientos_contratados) * 100),
    }))

  return (
    <Stack spacing={3}>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
        <KpiCard label="Empresas activas"   value={empresasActivas}       sub={`de ${empresas.length} registradas`}                                 borderColor="emerald" ring={empresasPct} />
        <KpiCard label="Empleados en LMS"   value={totalEmpleadosActivos} sub={`de ${totalContratados} cupos contratados`}                          borderColor="violet"  ring={empleadosPct} />
        <KpiCard label="Ocupación de cupos" value={`${ocupacionPct}%`}    sub={`${totalUsados} usados · ${totalContratados - totalUsados} libres`} borderColor="amber"   ring={ocupacionPct}    alert={ocupacionPct >= 90} />
        <SparklineKpi total={totalEventos} data={activityData} />
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

        <CompanyProgressKpi empresas={rankingEmpresas} globalAvg={globalAvg} />
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { lg: "1fr 280px" } }}>
        <ActivityFeed items={recentEvents} />
        <QuickActions />
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { lg: "1fr 300px" } }}>
        <OcupacionCard ocupacionPct={ocupacionPct} empresas={empresas} />
        <RenovacionesTable renewals={renewals} />
      </Box>
    </Stack>
  )
}
