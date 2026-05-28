import { formatDate, formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { ArrowLeft, Calendar, Mail, Phone, User } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

// ── Pure-SVG charts ─────────────────────────────────────────────────

function DonutChart({ pct, size = 160 }: { pct: number; size?: number }) {
  const sw = 16
  const r = (size - sw) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  const color = pct >= 75 ? "#0d9488" : pct >= 40 ? "#f59e0b" : "#f43f5e"
  const empty = pct === 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={sw} />
      {!empty && (
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
      <text x={cx} y={cy - 7} textAnchor="middle" fill="#0f172a" fontSize={size * 0.18} fontWeight="700">
        {empty ? "—" : `${pct}%`}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fill="#94a3b8" fontSize={size * 0.085}>
        avance gbl.
      </text>
    </svg>
  )
}

function SeatDonut({ used, total }: { used: number; total: number }) {
  const pct = total ? Math.round((used / total) * 100) : 0
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  const color = pct >= 90 ? "#f43f5e" : pct >= 70 ? "#f59e0b" : "#0d9488"
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" aria-hidden>
      <circle cx={36} cy={36} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
      <circle
        cx={36} cy={36} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
      />
      <text x={36} y={40} textAnchor="middle" fill="#0f172a" fontSize={12} fontWeight="700">
        {pct}%
      </text>
    </svg>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────

function getInitials(nombre: string, apellido: string) {
  return `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase()
}

function barColor(pct: number) {
  return pct >= 75 ? "bg-teal-500" : pct >= 40 ? "bg-amber-400" : "bg-rose-400"
}

// ── Page ─────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ id: string }> }

export default async function EmpresaDetailPage({ params }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const { id } = await params
  const empresaId = Number(id)
  if (!Number.isInteger(empresaId) || empresaId <= 0) notFound()

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    include: {
      empleados: {
        include: {
          cursos: { orderBy: { nombre_curso: "asc" } },
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
  const allCourses = empresa.empleados.flatMap((e) => e.cursos)
  const allConstancias = empresa.empleados.flatMap((e) => e.constancias)
  const avgProgress = allCourses.length
    ? Math.round(allCourses.reduce((s, c) => s + c.progreso_pct, 0) / allCourses.length)
    : 0

  const activePaquete = empresa.paquetes.find((p) => p.activo) ?? empresa.paquetes[0] ?? null
  const paqueteCursos = activePaquete?.paquete?.cursos ?? []

  // Per-employee stats, sorted by avg desc
  const empleadoStats = activeEmpleados
    .map((e) => {
      const avg = e.cursos.length
        ? Math.round(e.cursos.reduce((s, c) => s + c.progreso_pct, 0) / e.cursos.length)
        : 0
      const completed = e.cursos.filter((c) => c.completado).length
      const hasError = e.cursos.some((c) => c.acceso_estado === "ERROR")
      const lastSync = [...e.cursos].sort(
        (a, b) =>
          new Date(b.ultima_sincronizacion).getTime() -
          new Date(a.ultima_sincronizacion).getTime()
      )[0]?.ultima_sincronizacion
      return {
        ...e,
        avg,
        completed,
        total: e.cursos.length,
        constanciasCount: e.constancias.length,
        hasError,
        lastSync,
      }
    })
    .sort((a, b) => b.avg - a.avg)

  // Per-course stats (from paquete courses)
  const courseStats = paqueteCursos.map((pc) => {
    const assigned = allCourses.filter((c) => c.wp_curso_id === pc.wp_curso_id)
    const completed = assigned.filter((c) => c.completado).length
    const inProgress = assigned.filter((c) => !c.completado && c.progreso_pct > 0).length
    const notStarted = assigned.filter((c) => c.progreso_pct === 0).length
    const avgPct = assigned.length
      ? Math.round(assigned.reduce((s, c) => s + c.progreso_pct, 0) / assigned.length)
      : 0
    return { ...pc, assigned: assigned.length, completed, inProgress, notStarted, avgPct }
  })

  const rh = empresa.usuarios[0]
  const seatPct = empresa.asientos_contratados
    ? Math.round((empresa.asientos_usados / empresa.asientos_contratados) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="space-y-3">
        <Link
          href="/superadmin/empresas"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Empresas
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                {empresa.nombre}
              </h1>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  empresa.activo ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                {empresa.activo ? "Activa" : "Suspendida"}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-4 text-xs text-slate-500">
              {empresa.rfc && (
                <span className="font-mono font-medium text-slate-700">{empresa.rfc}</span>
              )}
              <span className="flex items-center gap-1">
                <Mail size={11} />
                {empresa.email_rh}
              </span>
              {empresa.telefono && (
                <span className="flex items-center gap-1">
                  <Phone size={11} />
                  {empresa.telefono}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                Alta {formatDate(empresa.created_at)}
              </span>
              {rh && (
                <span className="flex items-center gap-1">
                  <User size={11} />
                  {rh.nombre}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Executive charts row ─── */}
      <div className="grid gap-5 xl:grid-cols-[200px_1fr_200px]">
        {/* Donut — overall progress */}
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
          <DonutChart pct={avgProgress} size={160} />
          <div className="w-full space-y-2 border-t border-slate-100 pt-3 text-center">
            <div className="text-2xl font-bold tabular-nums text-slate-950">
              {activeEmpleados.length}
              <span className="ml-1 text-sm font-normal text-slate-400">
                / {empresa.asientos_contratados}
              </span>
            </div>
            <p className="text-xs text-slate-400">empleados activos</p>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-950">
              {allConstancias.length}
            </div>
            <p className="text-xs text-slate-400">constancias emitidas</p>
          </div>
        </div>

        {/* Employee ranked horizontal bars */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-950">
            Progreso por empleado
            <span className="ml-2 text-xs font-normal text-slate-400">
              ordenado de mayor a menor
            </span>
          </h2>

          {empleadoStats.length === 0 ? (
            <p className="text-sm text-slate-400">Sin empleados activos.</p>
          ) : (
            <div className="space-y-2.5">
              {empleadoStats.map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  <div
                    className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                      e.hasError ? "bg-rose-100 text-rose-700" : "bg-violet-100 text-violet-700"
                    }`}
                  >
                    {getInitials(e.nombre, e.apellido)}
                  </div>
                  <span className="w-28 shrink-0 truncate text-xs text-slate-700">
                    {e.nombre} {e.apellido}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${barColor(e.avg)}`}
                          style={{ width: `${e.avg}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-800">
                        {e.avg}%
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {e.completed}/{e.total} cursos · {e.constanciasCount} constancias
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seat utilization + package info */}
        <div className="space-y-4">
          {/* Seat utilization */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Uso de cupos
            </p>
            <div className="flex items-center gap-4">
              <SeatDonut used={empresa.asientos_usados} total={empresa.asientos_contratados} />
              <div className="space-y-1 text-xs text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">{empresa.asientos_usados}</span>{" "}
                  en uso
                </p>
                <p>
                  <span className="font-semibold text-slate-900">
                    {Math.max(empresa.asientos_contratados - empresa.asientos_usados, 0)}
                  </span>{" "}
                  disponibles
                </p>
                <p>
                  <span className="font-semibold text-slate-900">
                    {empresa.asientos_contratados}
                  </span>{" "}
                  contratados
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${seatPct >= 90 ? "bg-rose-400" : seatPct >= 70 ? "bg-amber-400" : "bg-teal-500"}`}
                style={{ width: `${seatPct}%` }}
              />
            </div>
          </div>

          {/* Package */}
          {activePaquete ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Paquete activo
              </p>
              <p className="text-sm font-semibold text-slate-950">
                {activePaquete.paquete?.nombre ?? "—"}
              </p>
              <div className="mt-2 space-y-1 text-xs text-slate-500">
                <p>Inicio: {formatDate(activePaquete.fecha_inicio)}</p>
                <p>
                  Vence:{" "}
                  {activePaquete.fecha_vencimiento
                    ? formatDate(activePaquete.fecha_vencimiento)
                    : "Sin vencimiento"}
                </p>
                <p>{paqueteCursos.length} cursos incluidos</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center text-xs text-slate-400">
              Sin paquete asignado
            </div>
          )}
        </div>
      </div>

      {/* ── Course completion breakdown ─── */}
      {courseStats.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-slate-950">
            Avance por curso
          </h2>
          <div className="mb-4 flex items-center gap-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-sm bg-teal-500" /> Completado
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-sm bg-amber-400" /> En curso
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-sm bg-slate-200" /> Pendiente
            </span>
          </div>

          <div className="space-y-3">
            {courseStats.map((c) => {
              const cPct = c.assigned ? (c.completed / c.assigned) * 100 : 0
              const iPct = c.assigned ? (c.inProgress / c.assigned) * 100 : 0
              return (
                <div key={c.wp_curso_id}>
                  <div className="mb-1 flex items-center justify-between gap-4">
                    <p className="truncate text-xs font-medium text-slate-800">{c.nombre_curso}</p>
                    <div className="flex shrink-0 items-center gap-3 text-[10px] text-slate-400">
                      <span className="text-teal-700 font-semibold">{c.completed} completados</span>
                      <span>{c.inProgress} en curso</span>
                      <span>{c.notStarted} pendientes</span>
                      {c.assigned > 0 && (
                        <span className="font-semibold text-slate-700">{c.avgPct}% avg</span>
                      )}
                    </div>
                  </div>
                  {c.assigned > 0 ? (
                    <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="bg-teal-500" style={{ width: `${cPct}%` }} />
                      <div className="bg-amber-400" style={{ width: `${iPct}%` }} />
                    </div>
                  ) : (
                    <div className="h-3 rounded-full bg-slate-100" />
                  )}
                  {c.assigned === 0 && (
                    <p className="mt-0.5 text-[10px] text-slate-400">Sin empleados asignados a este curso</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Employee detail table ─── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-950">
          Detalle de empleados
          <span className="ml-2 text-xs font-normal text-slate-400">
            {activeEmpleados.length} activos
            {empresa.empleados.length - activeEmpleados.length > 0
              ? ` · ${empresa.empleados.length - activeEmpleados.length} suspendidos`
              : ""}
          </span>
        </h2>

        {empleadoStats.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
            Sin empleados activos registrados.
          </div>
        ) : (
          <div className="space-y-1.5">
            {empleadoStats.map((e) => (
              <div
                key={e.id}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  e.hasError
                    ? "border-rose-200 bg-rose-50/40"
                    : "border-slate-200 bg-white hover:bg-slate-50/50"
                }`}
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                    e.hasError ? "bg-rose-100 text-rose-700" : "bg-violet-100 text-violet-700"
                  }`}
                >
                  {getInitials(e.nombre, e.apellido)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-950">
                    {e.nombre} {e.apellido}
                    {!e.activo && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                        Suspendido
                      </span>
                    )}
                    {e.hasError && (
                      <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700">
                        Error
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {e.email}
                    {e.departamento ? ` · ${e.departamento}` : ""}
                    {e.puesto ? ` · ${e.puesto}` : ""}
                  </p>
                </div>

                <div className="hidden w-32 shrink-0 sm:block">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${barColor(e.avg)}`}
                      style={{ width: `${e.avg}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-right text-[10px] font-semibold text-slate-600">
                    {e.avg}%
                  </p>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-sm font-bold tabular-nums text-slate-950">
                    {e.completed}/{e.total}
                  </p>
                  <p className="text-[10px] text-slate-400">cursos</p>
                </div>

                <div className="hidden shrink-0 text-right lg:block">
                  <p className="text-sm font-bold tabular-nums text-slate-950">
                    {e.constanciasCount}
                  </p>
                  <p className="text-[10px] text-slate-400">constancias</p>
                </div>

                {e.lastSync && (
                  <div className="hidden shrink-0 text-right xl:block">
                    <p className="text-[10px] text-slate-400">{formatDateTime(e.lastSync)}</p>
                    <p className="text-[10px] text-slate-400">última sync</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {empresa.notas && (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Notas internas
          </p>
          <p className="text-sm text-slate-700">{empresa.notas}</p>
        </section>
      )}
    </div>
  )
}
