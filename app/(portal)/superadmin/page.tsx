import { redirect } from "next/navigation"
import { Box, LinearProgress, Stack, Typography } from "@mui/material"
import { getSuperadminEmpresasSnapshot, getSuperadminReportesSnapshot } from "@/lib/dashboard-cache"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ActivityFeed } from "@/components/superadmin/ActivityFeed"
import { QuickActions } from "@/components/superadmin/QuickActions"
import { SectionCard } from "@/components/mui/SectionCard"
import KpiCard from "@/components/portal/KpiCard"
import { OcupacionCard } from "./_components/OcupacionCard"
import { RenovacionesTable } from "./_components/RenovacionesTable"

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
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#EFEAE3" strokeWidth={sw} />
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
      <text x={cx} y={cx - 6}  textAnchor="middle" fill="#130303" fontSize={22} fontWeight="700">{total}</text>
      <text x={cx} y={cx + 12} textAnchor="middle" fill="#858382" fontSize={9}>cursos total</text>
    </svg>
  )
}

/** Vertical bar chart for activity over time */
function ActivityBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.5, height: 80 }}>
      {data.map((d) => {
        const h = Math.round((d.value / max) * 100)
        return (
          <Box key={d.label} sx={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", gap: 0.5 }}>
            <Box
              sx={{
                width: "100%",
                minHeight: "3px",
                height: `${h}%`,
                borderRadius: "2px 2px 0 0",
                bgcolor: d.value > 0 ? "primary.main" : "#EFEAE3",
              }}
            />
            <Typography sx={{ fontSize: 8, lineHeight: 1, color: "text.secondary" }}>
              {d.label}
            </Typography>
          </Box>
        )
      })}
    </Box>
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
    <Stack spacing={3}>

      {/* Row 1 — 4 KPI cards con anillo de progreso */}
      <Box sx={{ position: "relative" }}>
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: "-24px -24px auto -24px",
            height: 200,
            background: "radial-gradient(ellipse at top left, rgba(245,133,63,0.06), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <Box sx={{ position: "relative", display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
          <KpiCard label="Empresas activas"   value={empresasActivas}       sub={`de ${empresas.length} registradas`}                                 borderColor="green"   ring={empresasPct} />
          <KpiCard label="Empleados en LMS"   value={totalEmpleadosActivos} sub={`de ${totalContratados} cupos contratados`}                          borderColor="primary" ring={empleadosPct} />
          <KpiCard label="Ocupación de cupos" value={`${ocupacionPct}%`}    sub={`${totalUsados} usados · ${totalContratados - totalUsados} libres`} borderColor="blue"    ring={ocupacionPct}    alert={ocupacionPct >= 90} />
          <KpiCard label="Renovaciones"       value={renewals.length}       sub="empresas vencen en 30 días"                                          borderColor="amber"   ring={renovacionesPct} alert={renewals.length > 0} />
        </Box>
      </Box>

      {/* Row 2 — 3 analysis cards */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { lg: "repeat(3, 1fr)" } }}>

        {/* E — Estado global de aprendizaje */}
        <SectionCard title="Estado de aprendizaje">
          <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
            <DonutChart size={130} sw={16} segments={[
              { value: completados, color: "#22c55e", label: "Completados" },
              { value: enProgreso,  color: "#F5853F", label: "En progreso" },
              { value: sinIniciar,  color: "#EFEAE3", label: "Sin iniciar" },
            ]} />
            <Stack spacing={1.5} sx={{ minWidth: 0 }}>
              {[
                { label: "Completados",  value: completados, color: "#22c55e" },
                { label: "En progreso",  value: enProgreso,  color: "#F5853F" },
                { label: "Sin iniciar",  value: sinIniciar,  color: "#EFEAE3" },
              ].map((s) => (
                <Stack key={s.label} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Box sx={{ width: 10, height: 10, flexShrink: 0, borderRadius: "50%", bgcolor: s.color }} />
                  <Typography sx={{ minWidth: 0, flex: 1, fontSize: 12, color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.label}
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "text.primary" }}>
                    {s.value}
                  </Typography>
                  {totalCursos > 0 && (
                    <Typography sx={{ width: 32, textAlign: "right", fontSize: 10, color: "text.secondary" }}>
                      {Math.round((s.value / totalCursos) * 100)}%
                    </Typography>
                  )}
                </Stack>
              ))}
            </Stack>
          </Stack>
        </SectionCard>

        {/* F — Ranking de progreso por empresa */}
        <SectionCard title="Progreso por empresa">
          {rankingEmpresas.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              Sin datos de progreso.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {rankingEmpresas.map((e) => (
                <Box key={e.nombre}>
                  <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
                    <Typography sx={{ minWidth: 0, flex: 1, fontSize: 12, fontWeight: 500, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.nombre}
                    </Typography>
                    <Typography sx={{ flexShrink: 0, fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "text.secondary" }}>
                      {e.avg}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={e.avg}
                    sx={{
                      height: 6,
                      borderRadius: 999,
                      bgcolor: "#f1f5f9",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 999,
                        bgcolor: e.avg >= 75 ? "#22c55e" : e.avg >= 40 ? "primary.main" : "#f59e0b",
                      },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          )}
        </SectionCard>

        {/* G — Actividad de usuarios */}
        <SectionCard
          title="Actividad en el portal"
          action={
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
              {totalEventos} eventos · 14 días
            </Typography>
          }
        >
          <ActivityBarChart data={activityData} />
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5, mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
            {[
              { label: "Hoy",         value: activityData[activityData.length - 1]?.value ?? 0 },
              { label: "Ayer",        value: activityData[activityData.length - 2]?.value ?? 0 },
              { label: "Esta semana", value: activityData.slice(-7).reduce((s, d) => s + d.value, 0) },
              { label: "Total",       value: totalEventos },
            ].map((stat) => (
              <Box key={stat.label}>
                <Typography sx={{ fontSize: 10, color: "text.secondary" }}>{stat.label}</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "text.primary" }}>
                  {stat.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </SectionCard>
      </Box>

      {/* Row 3 — Activity feed + Quick actions */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { lg: "1fr 280px" } }}>
        <ActivityFeed items={recentEvents} />
        <QuickActions />
      </Box>

      {/* Row 4 — Ocupación + Renovaciones */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { lg: "1fr 300px" } }}>
        <OcupacionCard ocupacionPct={ocupacionPct} empresas={empresas} />
        <RenovacionesTable renewals={renewals} />
      </Box>
    </Stack>
  )
}
