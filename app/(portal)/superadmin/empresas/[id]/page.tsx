import { PanelBox } from "@/components/superadmin/PanelBox"
import { SeatDonut } from "@/components/superadmin/SeatDonut"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { ArrowLeft, Calendar, Mail, Phone, User } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

/* ── SVG Donuts ──────────────────────────────────────────────── */

function DonutChart({ pct, size = 160 }: { pct: number; size?: number }) {
  const sw = 14
  const r  = (size - sw) / 2
  const cx = size / 2
  const cy = size / 2
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

  const activeEmpleados  = empresa.empleados.filter((e) => e.activo)
  const allCourses       = empresa.empleados.flatMap((e) => e.cursos)
  const allConstancias   = empresa.empleados.flatMap((e) => e.constancias)
  const avgProgress      = allCourses.length
    ? Math.round(allCourses.reduce((s, c) => s + c.progreso_pct, 0) / allCourses.length)
    : 0

  const activePaquete  = empresa.paquetes.find((p) => p.activo) ?? empresa.paquetes[0] ?? null
  const paqueteCursos  = activePaquete?.paquete?.cursos ?? []

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
    const assigned    = allCourses.filter((c) => c.wp_curso_id === pc.wp_curso_id)
    const completed   = assigned.filter((c) => c.completado).length
    const inProgress  = assigned.filter((c) => !c.completado && c.progreso_pct > 0).length
    const notStarted  = assigned.filter((c) => c.progreso_pct === 0).length
    const avgPct      = assigned.length
      ? Math.round(assigned.reduce((s, c) => s + c.progreso_pct, 0) / assigned.length)
      : 0
    return { ...pc, assigned: assigned.length, completed, inProgress, notStarted, avgPct }
  })

  const rh      = empresa.usuarios[0]
  const seatPct = empresa.asientos_contratados
    ? Math.round((empresa.asientos_usados / empresa.asientos_contratados) * 100)
    : 0

  return (
    <div className="space-y-5">

      {/* Back + header */}
      <div className="space-y-3">
        <Link
          href="/superadmin/empresas"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-slate-600"
        >
          <ArrowLeft size={12} strokeWidth={2.5} />
          Empresas
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[24px] font-semibold" style={{ color: "#0f172a" }}>
                {empresa.nombre}
              </h1>
              {empresa.activo ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}
                >
                  <span className="size-1.5 rounded-full bg-green-500" />
                  Activa
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}
                >
                  <span className="size-1.5 rounded-full bg-slate-300" />
                  Suspendida
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-[12px]" style={{ color: "#94a3b8" }}>
              {empresa.rfc && (
                <span className="font-mono font-medium" style={{ color: "#475569" }}>
                  {empresa.rfc}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Mail size={11} />{empresa.email_rh}
              </span>
              {empresa.telefono && (
                <span className="flex items-center gap-1">
                  <Phone size={11} />{empresa.telefono}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={11} />Alta {formatDate(empresa.created_at)}
              </span>
              {rh && (
                <span className="flex items-center gap-1">
                  <User size={11} />{rh.nombre}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator style={{ background: "#f1f5f9" }} />

      {/* Summary row: donut + employee bars + seat/package cards */}
      <div className="grid gap-4 xl:grid-cols-[180px_1fr_180px]">

        {/* Global progress donut */}
        <PanelBox title="Avance">
          <div className="flex flex-col items-center gap-4 px-4 pb-4">
            <DonutChart pct={avgProgress} size={150} />
            <div className="w-full space-y-2 pt-1 text-center" style={{ borderTop: "1px solid #f1f5f9" }}>
              <p className="text-[22px] font-semibold tabular-nums" style={{ color: "#0f172a" }}>
                {activeEmpleados.length}
                <span className="ml-1 text-[13px] font-normal" style={{ color: "#94a3b8" }}>
                  / {empresa.asientos_contratados}
                </span>
              </p>
              <p className="text-[11px]" style={{ color: "#94a3b8" }}>empleados activos</p>
              <p className="text-[22px] font-semibold tabular-nums" style={{ color: "#0f172a" }}>
                {allConstancias.length}
              </p>
              <p className="text-[11px]" style={{ color: "#94a3b8" }}>constancias emitidas</p>
            </div>
          </div>
        </PanelBox>

        {/* Employee progress bars */}
        <PanelBox title="Progreso por empleado" description="Mayor a menor">
          <div className="p-5">
            {empleadoStats.length === 0 ? (
              <p className="text-[13px]" style={{ color: "#94a3b8" }}>Sin empleados activos.</p>
            ) : (
              <div className="space-y-3">
                {empleadoStats.map((e) => (
                  <div key={e.id} className="flex items-center gap-3">
                    <div
                      className="flex size-7 shrink-0 items-center justify-center rounded text-[10px] font-bold"
                      style={
                        e.hasError
                          ? { background: "#fef2f2", color: "#dc2626" }
                          : { background: "#eff4fb", color: "#1a4f8a" }
                      }
                    >
                      {getInitials(e.nombre, e.apellido)}
                    </div>
                    <span
                      className="w-28 shrink-0 truncate text-[12px]"
                      style={{ color: "#334155" }}
                    >
                      {e.nombre} {e.apellido}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "#f1f5f9" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${e.avg}%`, background: progressColor(e.avg) }}
                          />
                        </div>
                        <span
                          className="w-8 shrink-0 text-right text-[12px] font-semibold tabular-nums"
                          style={{ color: "#334155" }}
                        >
                          {e.avg}%
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px]" style={{ color: "#94a3b8" }}>
                        {e.completed}/{e.total} cursos · {e.constanciasCount} constancias
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PanelBox>

        {/* Seat + package */}
        <div className="flex flex-col gap-4">
          <PanelBox title="Cupos">
            <div className="p-4">
              <div className="flex items-center gap-4">
                <SeatDonut used={empresa.asientos_usados} total={empresa.asientos_contratados} />
                <div className="space-y-1 text-[12px]" style={{ color: "#64748b" }}>
                  <p>
                    <span className="font-semibold" style={{ color: "#0f172a" }}>{empresa.asientos_usados}</span> en uso
                  </p>
                  <p>
                    <span className="font-semibold" style={{ color: "#0f172a" }}>
                      {Math.max(empresa.asientos_contratados - empresa.asientos_usados, 0)}
                    </span>{" "}
                    disponibles
                  </p>
                  <p>
                    <span className="font-semibold" style={{ color: "#0f172a" }}>{empresa.asientos_contratados}</span>{" "}
                    contratados
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "#f1f5f9" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${seatPct}%`,
                    background: seatPct >= 90 ? "#dc2626" : seatPct >= 70 ? "#d97706" : "#1a4f8a",
                  }}
                />
              </div>
            </div>
          </PanelBox>

          <PanelBox title="Paquete activo">
            <div className="p-4">
              {activePaquete ? (
                <>
                  <p className="text-[13px] font-semibold" style={{ color: "#0f172a" }}>
                    {activePaquete.paquete?.nombre ?? "—"}
                  </p>
                  <div className="mt-2 space-y-1 text-[12px]" style={{ color: "#94a3b8" }}>
                    <p>Inicio: {formatDate(activePaquete.fecha_inicio)}</p>
                    <p>
                      Vence:{" "}
                      {activePaquete.fecha_vencimiento
                        ? formatDate(activePaquete.fecha_vencimiento)
                        : "Sin vencimiento"}
                    </p>
                    <p>{paqueteCursos.length} cursos incluidos</p>
                  </div>
                </>
              ) : (
                <p className="text-[12px]" style={{ color: "#94a3b8" }}>Sin paquete asignado</p>
              )}
            </div>
          </PanelBox>
        </div>
      </div>

      {/* Course breakdown */}
      {courseStats.length > 0 && (
        <PanelBox
          title="Avance por curso"
          action={
            <div className="flex items-center gap-4 text-[10px]" style={{ color: "#94a3b8" }}>
              <span className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-sm" style={{ background: "#1a4f8a" }} />
                Completado
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-sm bg-amber-400" />
                En curso
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-sm" style={{ background: "#f1f5f9" }} />
                Pendiente
              </span>
            </div>
          }
        >
          <div className="space-y-4 p-5">
            {courseStats.map((c) => {
              const cPct = c.assigned ? (c.completed / c.assigned) * 100 : 0
              const iPct = c.assigned ? (c.inProgress / c.assigned) * 100 : 0
              return (
                <div key={c.wp_curso_id}>
                  <div className="mb-1.5 flex items-center justify-between gap-4">
                    <p className="truncate text-[13px] font-medium" style={{ color: "#334155" }}>
                      {c.nombre_curso}
                    </p>
                    <div className="flex shrink-0 items-center gap-3 text-[11px]" style={{ color: "#94a3b8" }}>
                      <span className="font-semibold" style={{ color: "#1a4f8a" }}>{c.completed} compl.</span>
                      <span>{c.inProgress} en curso</span>
                      <span>{c.notStarted} pend.</span>
                      {c.assigned > 0 && (
                        <span className="font-semibold" style={{ color: "#475569" }}>{c.avgPct}% avg</span>
                      )}
                    </div>
                  </div>
                  {c.assigned > 0 ? (
                    <div className="flex h-2.5 overflow-hidden rounded-full" style={{ background: "#f1f5f9" }}>
                      <div style={{ background: "#1a4f8a", width: `${cPct}%` }} />
                      <div className="bg-amber-400" style={{ width: `${iPct}%` }} />
                    </div>
                  ) : (
                    <div className="h-2.5 rounded-full" style={{ background: "#f1f5f9" }} />
                  )}
                  {c.assigned === 0 && (
                    <p className="mt-0.5 text-[11px]" style={{ color: "#94a3b8" }}>
                      Sin empleados asignados
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </PanelBox>
      )}

      {/* Employee table */}
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
          <div className="px-6 py-10">
            <div
              className="rounded py-8 text-center text-[13px]"
              style={{
                border: "1px dashed #e2e8f0",
                background: "#fafafa",
                color: "#94a3b8",
              }}
            >
              Sin empleados activos registrados.
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow
                className="hover:bg-transparent"
                style={{ background: "#fafafa", borderBottom: "1px solid #f1f5f9" }}
              >
                {["Empleado", "Progreso", "Cursos", "Constancias", "WP sync", "Última sync"].map((h) => (
                  <TableHead
                    key={h}
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "#94a3b8",
                    }}
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {empleadoStats.map((e) => (
                <TableRow
                  key={e.id}
                  className="h-12 transition-colors hover:bg-slate-50/50"
                  style={{
                    borderBottom: "1px solid #f8fafc",
                    background: e.hasError ? "rgba(254,242,242,0.4)" : "transparent",
                  }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex size-7 shrink-0 items-center justify-center rounded text-[10px] font-bold"
                        style={
                          e.hasError
                            ? { background: "#fef2f2", color: "#dc2626" }
                            : { background: "#eff4fb", color: "#1a4f8a" }
                        }
                      >
                        {getInitials(e.nombre, e.apellido)}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium" style={{ color: "#0f172a" }}>
                          {e.nombre} {e.apellido}
                        </p>
                        <p className="text-[11px]" style={{ color: "#94a3b8" }}>{e.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="w-24">
                      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "#f1f5f9" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${e.avg}%`, background: progressColor(e.avg) }}
                        />
                      </div>
                      <p
                        className="mt-0.5 text-right text-[10px] font-semibold"
                        style={{ color: "#64748b" }}
                      >
                        {e.avg}%
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] font-semibold tabular-nums" style={{ color: "#0f172a" }}>
                      {e.completed}/{e.total}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] font-semibold tabular-nums" style={{ color: "#0f172a" }}>
                      {e.constanciasCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    {e.hasError ? (
                      <span
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
                      >
                        Error
                      </span>
                    ) : e.wp_user_id ? (
                      <span
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}
                      >
                        Sincronizado
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}
                      >
                        Sin WP ID
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[11px]" style={{ color: "#94a3b8" }}>
                      {e.lastSync ? formatDateTime(e.lastSync) : "—"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PanelBox>

      {/* Internal notes */}
      {empresa.notas && (
        <PanelBox title="Notas internas">
          <div className="p-5">
            <p className="text-[13px]" style={{ color: "#475569" }}>
              {empresa.notas}
            </p>
          </div>
        </PanelBox>
      )}
    </div>
  )
}
