import { PanelBox } from "@/components/superadmin/PanelBox"
import { SeatDonut } from "@/components/superadmin/SeatDonut"
import { formatDate, formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { ArrowLeft, Calendar, Mail, Phone, User } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import Divider from "@mui/material/Divider"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import Typography from "@mui/material/Typography"

function DonutChart({ pct, size = 160 }: { pct: number; size?: number }) {
  const sw    = 14
  const r     = (size - sw) / 2
  const cx    = size / 2
  const cy    = size / 2
  const circ  = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  const color = pct >= 75 ? "#1a4f8a" : pct >= 40 ? "#d97706" : "#dc2626"
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
      {pct > 0 && (
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
      <text x={cx} y={cy - 7} textAnchor="middle" fill="#0f172a" fontSize={size * 0.17} fontWeight="600">
        {pct === 0 ? "—" : `${pct}%`}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fill="#94a3b8" fontSize={size * 0.08}>
        avance gbl.
      </text>
    </svg>
  )
}

function getInitials(nombre: string, apellido: string) {
  return `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase()
}

function progressColor(pct: number) {
  return pct >= 75 ? "#1a4f8a" : pct >= 40 ? "#d97706" : "#dc2626"
}

const TH_SX = {
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  color: "#94a3b8",
  bgcolor: "#fafafa",
  borderBottom: "1px solid #f1f5f9",
}

const TD_SX = { borderBottom: "1px solid #f8fafc" }

type PageProps = { params: Promise<{ id: string }> }

export default async function EmpresaDetailPage({ params }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const { id }    = await params
  const empresaId = Number(id)
  if (!Number.isInteger(empresaId) || empresaId <= 0) notFound()

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    include: {
      empleados: {
        include: {
          cursos:      { orderBy: { nombre_curso: "asc" } },
          constancias: true,
        },
        orderBy: { nombre: "asc" },
      },
      paquetes: {
        include: {
          paquete: {
            include: { cursos: { select: { wp_curso_id: true, nombre_curso: true } } },
          },
        },
        orderBy: { created_at: "desc" },
      },
      usuarios: {
        where: { rol: "RH" },
        select: { nombre: true, email: true },
        take: 1,
      },
    },
  })
  if (!empresa) notFound()

  const activeEmpleados = empresa.empleados.filter((e) => e.activo)
  const allCourses      = empresa.empleados.flatMap((e) => e.cursos)
  const allConstancias  = empresa.empleados.flatMap((e) => e.constancias)
  const avgProgress     = allCourses.length
    ? Math.round(allCourses.reduce((s, c) => s + c.progreso_pct, 0) / allCourses.length)
    : 0

  const activePaquete = empresa.paquetes.find((p) => p.activo) ?? empresa.paquetes[0] ?? null
  const paqueteCursos = activePaquete?.paquete?.cursos ?? []

  const empleadoStats = activeEmpleados
    .map((e) => {
      const avg       = e.cursos.length
        ? Math.round(e.cursos.reduce((s, c) => s + c.progreso_pct, 0) / e.cursos.length)
        : 0
      const completed = e.cursos.filter((c) => c.completado).length
      const hasError  = e.cursos.some((c) => c.acceso_estado === "ERROR")
      const lastSync  = [...e.cursos].sort(
        (a, b) => new Date(b.ultima_sincronizacion).getTime() - new Date(a.ultima_sincronizacion).getTime()
      )[0]?.ultima_sincronizacion
      return { ...e, avg, completed, total: e.cursos.length, constanciasCount: e.constancias.length, hasError, lastSync }
    })
    .sort((a, b) => b.avg - a.avg)

  const courseStats = paqueteCursos.map((pc) => {
    const assigned   = allCourses.filter((c) => c.wp_curso_id === pc.wp_curso_id)
    const completed  = assigned.filter((c) => c.completado).length
    const inProgress = assigned.filter((c) => !c.completado && c.progreso_pct > 0).length
    const notStarted = assigned.filter((c) => c.progreso_pct === 0).length
    const avgPct     = assigned.length
      ? Math.round(assigned.reduce((s, c) => s + c.progreso_pct, 0) / assigned.length)
      : 0
    return { ...pc, assigned: assigned.length, completed, inProgress, notStarted, avgPct }
  })

  const rh      = empresa.usuarios[0]
  const seatPct = empresa.asientos_contratados
    ? Math.round((empresa.asientos_usados / empresa.asientos_contratados) * 100)
    : 0

  return (
    <Box sx={{ display: "grid", gap: 2.5 }}>
      <Box sx={{ display: "grid", gap: 1.5 }}>
        <Link
          href="/superadmin/companies"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 500,
            color: "#64748b",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={12} strokeWidth={2.5} />
          Empresas
        </Link>

        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography sx={{ fontSize: 24, fontWeight: 600, color: "#0f172a" }}>
                {empresa.nombre}
              </Typography>
              <Chip
                label={empresa.activo ? "Activa" : "Suspendida"}
                size="small"
                icon={
                  <Box
                    component="span"
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: empresa.activo ? "#22c55e" : "#cbd5e1",
                      ml: "6px !important",
                    }}
                  />
                }
                sx={{
                  height: 24,
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "1px solid",
                  borderColor: empresa.activo ? "#bbf7d0" : "#e2e8f0",
                  bgcolor: empresa.activo ? "#f0fdf4" : "#f8fafc",
                  color: empresa.activo ? "#16a34a" : "#64748b",
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            </Box>
            <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 2, fontSize: 12, color: "#94a3b8" }}>
              {empresa.rfc && (
                <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 500, color: "#475569" }}>
                  {empresa.rfc}
                </Box>
              )}
              <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Mail size={11} />{empresa.email_rh}
              </Box>
              {empresa.telefono && (
                <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Phone size={11} />{empresa.telefono}
                </Box>
              )}
              <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Calendar size={11} />Alta {formatDate(empresa.created_at)}
              </Box>
              {rh && (
                <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <User size={11} />{rh.nombre}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: "#f1f5f9" }} />

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "180px 1fr 180px" } }}>
        <PanelBox title="Avance">
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, px: 2, pb: 2 }}>
            <DonutChart pct={avgProgress} size={150} />
            <Box sx={{ width: "100%", display: "grid", gap: 1, pt: 1, textAlign: "center", borderTop: "1px solid #f1f5f9" }}>
              <Box>
                <Typography sx={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "#0f172a" }}>
                  {activeEmpleados.length}
                  <Box component="span" sx={{ ml: 0.5, fontSize: 13, fontWeight: 400, color: "#94a3b8" }}>
                    / {empresa.asientos_contratados}
                  </Box>
                </Typography>
                <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>empleados activos</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "#0f172a" }}>
                  {allConstancias.length}
                </Typography>
                <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>constancias emitidas</Typography>
              </Box>
            </Box>
          </Box>
        </PanelBox>

        <PanelBox title="Progreso por empleado" description="Mayor a menor">
          <Box sx={{ p: 2.5 }}>
            {empleadoStats.length === 0 ? (
              <Typography sx={{ fontSize: 13, color: "#94a3b8" }}>Sin empleados activos.</Typography>
            ) : (
              <Box sx={{ display: "grid", gap: 1.5 }}>
                {empleadoStats.map((e) => (
                  <Box key={e.id} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 28,
                        height: 28,
                        flexShrink: 0,
                        borderRadius: 1,
                        fontSize: "10px",
                        fontWeight: 700,
                        ...(e.hasError ? { bgcolor: "#fef2f2", color: "#dc2626" } : { bgcolor: "#eff4fb", color: "#1a4f8a" }),
                      }}
                    >
                      {getInitials(e.nombre, e.apellido)}
                    </Box>
                    <Typography sx={{ width: 112, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: "#334155" }}>
                      {e.nombre} {e.apellido}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ flex: 1, height: 8, overflow: "hidden", borderRadius: "999px", bgcolor: "#f1f5f9" }}>
                          <Box sx={{ height: "100%", borderRadius: "999px", bgcolor: progressColor(e.avg), width: `${e.avg}%` }} />
                        </Box>
                        <Typography sx={{ width: 32, flexShrink: 0, textAlign: "right", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "#334155" }}>
                          {e.avg}%
                        </Typography>
                      </Box>
                      <Typography sx={{ mt: 0.25, fontSize: "10px", color: "#94a3b8" }}>
                        {e.completed}/{e.total} cursos · {e.constanciasCount} constancias
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </PanelBox>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <PanelBox title="Cupos">
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <SeatDonut used={empresa.asientos_usados} total={empresa.asientos_contratados} />
                <Box sx={{ display: "grid", gap: 0.5, fontSize: 12, color: "#64748b" }}>
                  <Typography sx={{ fontSize: 12, color: "#64748b" }}>
                    <Box component="span" sx={{ fontWeight: 600, color: "#0f172a" }}>{empresa.asientos_usados}</Box> en uso
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#64748b" }}>
                    <Box component="span" sx={{ fontWeight: 600, color: "#0f172a" }}>
                      {Math.max(empresa.asientos_contratados - empresa.asientos_usados, 0)}
                    </Box>{" "}disponibles
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#64748b" }}>
                    <Box component="span" sx={{ fontWeight: 600, color: "#0f172a" }}>{empresa.asientos_contratados}</Box> contratados
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 1.5, height: 6, overflow: "hidden", borderRadius: "999px", bgcolor: "#f1f5f9" }}>
                <Box
                  sx={{
                    height: "100%",
                    borderRadius: "999px",
                    bgcolor: seatPct >= 90 ? "#dc2626" : seatPct >= 70 ? "#d97706" : "#1a4f8a",
                    width: `${seatPct}%`,
                  }}
                />
              </Box>
            </Box>
          </PanelBox>

          <PanelBox title="Paquete activo">
            <Box sx={{ p: 2 }}>
              {activePaquete ? (
                <>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                    {activePaquete.paquete?.nombre ?? "—"}
                  </Typography>
                  <Box sx={{ mt: 1, display: "grid", gap: 0.5, fontSize: 12, color: "#94a3b8" }}>
                    <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>Inicio: {formatDate(activePaquete.fecha_inicio)}</Typography>
                    <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>
                      Vence:{" "}
                      {activePaquete.fecha_vencimiento ? formatDate(activePaquete.fecha_vencimiento) : "Sin vencimiento"}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>{paqueteCursos.length} cursos incluidos</Typography>
                  </Box>
                </>
              ) : (
                <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>Sin paquete asignado</Typography>
              )}
            </Box>
          </PanelBox>
        </Box>
      </Box>

      {courseStats.length > 0 && (
        <PanelBox
          title="Avance por curso"
          action={
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, fontSize: "10px", color: "#94a3b8" }}>
              {[
                { color: "#1a4f8a", label: "Completado" },
                { color: "#fbbf24", label: "En curso" },
                { color: "#f1f5f9", label: "Pendiente" },
              ].map(({ color, label }) => (
                <Box key={label} component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: "10px", color: "#94a3b8" }}>
                  <Box component="span" sx={{ display: "inline-block", width: 8, height: 8, borderRadius: 0.5, bgcolor: color }} />
                  {label}
                </Box>
              ))}
            </Box>
          }
        >
          <Box sx={{ display: "grid", gap: 2, p: 2.5 }}>
            {courseStats.map((c) => {
              const cPct = c.assigned ? (c.completed / c.assigned) * 100 : 0
              const iPct = c.assigned ? (c.inProgress / c.assigned) * 100 : 0
              return (
                <Box key={c.wp_curso_id}>
                  <Box sx={{ mb: 0.75, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.nombre_curso}
                    </Typography>
                    <Box sx={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 1.5, fontSize: 11, color: "#94a3b8" }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#1a4f8a" }}>{c.completed} compl.</Typography>
                      <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>{c.inProgress} en curso</Typography>
                      <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>{c.notStarted} pend.</Typography>
                      {c.assigned > 0 && (
                        <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{c.avgPct}% avg</Typography>
                      )}
                    </Box>
                  </Box>
                  {c.assigned > 0 ? (
                    <Box sx={{ display: "flex", height: 10, overflow: "hidden", borderRadius: "999px", bgcolor: "#f1f5f9" }}>
                      <Box sx={{ bgcolor: "#1a4f8a", width: `${cPct}%` }} />
                      <Box sx={{ bgcolor: "#fbbf24", width: `${iPct}%` }} />
                    </Box>
                  ) : (
                    <Box sx={{ height: 10, borderRadius: "999px", bgcolor: "#f1f5f9" }} />
                  )}
                  {c.assigned === 0 && (
                    <Typography sx={{ mt: 0.25, fontSize: 11, color: "#94a3b8" }}>Sin empleados asignados</Typography>
                  )}
                </Box>
              )
            })}
          </Box>
        </PanelBox>
      )}

      <PanelBox
        title="Detalle de empleados"
        count={activeEmpleados.length}
        description={
          empresa.empleados.length - activeEmpleados.length > 0
            ? `${empresa.empleados.length - activeEmpleados.length} suspendidos`
            : undefined
        }
        noPadding
      >
        {empleadoStats.length === 0 ? (
          <Box sx={{ px: 3, py: 5 }}>
            <Box sx={{ borderRadius: 1.5, border: "1px dashed #e2e8f0", bgcolor: "#fafafa", py: 4, textAlign: "center" }}>
              <Typography sx={{ fontSize: 13, color: "#94a3b8" }}>Sin empleados activos registrados.</Typography>
            </Box>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                {["Empleado", "Progreso", "Cursos", "Constancias", "WP sync", "Última sync"].map((h) => (
                  <TableCell key={h} sx={TH_SX}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {empleadoStats.map((e) => (
                <TableRow
                  key={e.id}
                  sx={{
                    height: 48,
                    bgcolor: e.hasError ? "rgba(254,242,242,0.4)" : "transparent",
                    "&:hover": { bgcolor: "rgba(248,250,252,0.5)" },
                    ...TD_SX,
                  }}
                >
                  <TableCell sx={TD_SX}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 28,
                          height: 28,
                          flexShrink: 0,
                          borderRadius: 1,
                          fontSize: "10px",
                          fontWeight: 700,
                          ...(e.hasError ? { bgcolor: "#fef2f2", color: "#dc2626" } : { bgcolor: "#eff4fb", color: "#1a4f8a" }),
                        }}
                      >
                        {getInitials(e.nombre, e.apellido)}
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>
                          {e.nombre} {e.apellido}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>{e.email}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={TD_SX}>
                    <Box sx={{ width: 96 }}>
                      <Box sx={{ height: 6, overflow: "hidden", borderRadius: "999px", bgcolor: "#f1f5f9" }}>
                        <Box sx={{ height: "100%", borderRadius: "999px", bgcolor: progressColor(e.avg), width: `${e.avg}%` }} />
                      </Box>
                      <Typography sx={{ mt: 0.25, textAlign: "right", fontSize: "10px", fontWeight: 600, color: "#64748b" }}>
                        {e.avg}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={TD_SX}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "#0f172a" }}>
                      {e.completed}/{e.total}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TD_SX}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "#0f172a" }}>
                      {e.constanciasCount}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TD_SX}>
                    {e.hasError ? (
                      <Chip label="Error" size="small" sx={{ height: 20, fontSize: 11, fontWeight: 600, border: "1px solid #fecaca", bgcolor: "#fef2f2", color: "#dc2626", "& .MuiChip-label": { px: 1 } }} />
                    ) : e.wp_user_id ? (
                      <Chip label="Sincronizado" size="small" sx={{ height: 20, fontSize: 11, fontWeight: 600, border: "1px solid #bbf7d0", bgcolor: "#f0fdf4", color: "#16a34a", "& .MuiChip-label": { px: 1 } }} />
                    ) : (
                      <Chip label="Sin WP ID" size="small" sx={{ height: 20, fontSize: 11, fontWeight: 600, border: "1px solid #e2e8f0", bgcolor: "#f8fafc", color: "#64748b", "& .MuiChip-label": { px: 1 } }} />
                    )}
                  </TableCell>
                  <TableCell sx={TD_SX}>
                    <Typography sx={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>
                      {e.lastSync ? formatDateTime(e.lastSync) : "—"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PanelBox>

      {empresa.notas && (
        <PanelBox title="Notas internas">
          <Box sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 13, color: "#475569" }}>{empresa.notas}</Typography>
          </Box>
        </PanelBox>
      )}
    </Box>
  )
}
