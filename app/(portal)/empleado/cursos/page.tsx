import KpiCard from "@/components/portal/KpiCard"
import PageHeader from "@/components/portal/PageHeader"
import StatusBadge from "@/components/portal/StatusBadge"
import EmployeeLearningRefresh from "@/components/portal/EmployeeLearningRefresh"
import { getEmployeeLearningData } from "@/lib/employee-learning"
import { formatDateTime } from "@/lib/format"
import type { PortalCourseRecord } from "@/lib/learning-types"
import { getSession } from "@/lib/session"
import {
  buildWordPressCourseLaunchUrl,
  getWordPressSiteUrl,
  isWordPressBridgeConfigured,
} from "@/lib/wordpress-bridge"
import { getWordPressCourseCatalog } from "@/lib/wordpress-course-catalog"
import { Award, BookOpen, CheckCircle, Clock } from "lucide-react"
import { Fragment } from "react"
import { redirect } from "next/navigation"

function getCourseUrl(
  courseId: number,
  courseUrlById: Map<number, string>,
  fallbackUrlById: Map<number, string>
) {
  const direct = courseUrlById.get(courseId)
  if (direct) return direct
  const fallback = fallbackUrlById.get(courseId)
  if (fallback) return fallback
  const siteUrl = getWordPressSiteUrl()
  return siteUrl ? `${siteUrl}/?p=${courseId}` : null
}

function RingChart({ pct }: { pct: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  const color = pct >= 80 ? "#F5853F" : pct >= 40 ? "#f59e0b" : "#f43f5e"
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" aria-hidden="true">
      <circle cx={36} cy={36} r={r} fill="none" stroke="#e2e8f0" strokeWidth={7} />
      <circle
        cx={36}
        cy={36}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
      />
      <text x={36} y={40} textAnchor="middle" fill="#1a1a1a" fontSize={13} fontWeight={700}>
        {pct}%
      </text>
    </svg>
  )
}

export default async function EmpleadoCursos() {
  const session = await getSession()
  if (!session || session.user.rol !== "EMPLEADO" || !session.user.empresa_id) {
    redirect("/login")
  }

  const learningData = await getEmployeeLearningData(session.user.email ?? "")
  const empleado = learningData?.empleado

  if (!empleado) redirect("/login")

  let courseUrlById = new Map<number, string>()
  let fallbackUrlById = new Map<number, string>()
  let thumbnailById = new Map<number, string>()

  if (isWordPressBridgeConfigured()) {
    try {
      const bridgeCourses = await getWordPressCourseCatalog()
      courseUrlById = new Map(
        bridgeCourses.courses
          .filter((c) => c.course_url)
          .map((c) => [c.wp_course_id, c.course_url as string])
      )
      const siteUrl = getWordPressSiteUrl()
      fallbackUrlById = new Map(
        bridgeCourses.courses
          .filter((c) => c.post_type && siteUrl)
          .map((c) => [
            c.wp_course_id,
            `${siteUrl}/?post_type=${c.post_type}&p=${c.wp_course_id}`,
          ])
      )
      thumbnailById = new Map(
        bridgeCourses.courses
          .filter((c) => c.thumbnail_url)
          .map((c) => [c.wp_course_id, c.thumbnail_url as string])
      )
    } catch {}
  }

  if (session.user.empresa_id) {
    try {
      const { prisma } = await import("@/lib/prisma")
      const pkg = await prisma.empresa.findUnique({
        where: { id: session.user.empresa_id },
        select: {
          paquetes: {
            where: { activo: true },
            select: {
              paquete: {
                select: { cursos: { select: { wp_curso_id: true, portada_url: true } } },
              },
            },
            take: 1,
          },
        },
      })
      for (const c of pkg?.paquetes[0]?.paquete?.cursos ?? []) {
        if (c.portada_url) thumbnailById.set(c.wp_curso_id, c.portada_url)
      }
    } catch {}
  }

  const cursos = empleado.cursos as PortalCourseRecord[]

  type RutaData = {
    id: number
    nombre: string
    cursos: { id: number; wp_curso_id: number; nombre_curso: string; orden: number }[]
  }
  let ruta: RutaData | null = null
  let dc3MetaMap = new Map<number, { duracion_horas: number | null }>()
  let pkgCourseMap = new Map<number, { descripcion: string | null; num_lecciones: number | null }>()

  if (session.user.empresa_id && cursos.length > 0) {
    try {
      const { prisma } = await import("@/lib/prisma")
      const wpIds = cursos.map((c) => c.wp_curso_id)

      const [empresaConRuta, dc3MetaRecords, pkgCourses] = await Promise.all([
        prisma.empresa.findUnique({
          where: { id: session.user.empresa_id },
          select: {
            ruta_aprendizaje: {
              select: {
                id: true,
                nombre: true,
                cursos: {
                  select: { id: true, wp_curso_id: true, nombre_curso: true, orden: true },
                  orderBy: { orden: "asc" },
                },
              },
            },
          },
        }),
        prisma.cursoDc3Metadata.findMany({
          where: { wp_curso_id: { in: wpIds } },
          select: { wp_curso_id: true, duracion_horas: true },
        }),
        prisma.paqueteCurso.findMany({
          where: { wp_curso_id: { in: wpIds } },
          select: { wp_curso_id: true, descripcion: true, num_lecciones: true },
          distinct: ["wp_curso_id"],
        }),
      ])

      ruta = empresaConRuta?.ruta_aprendizaje ?? null
      dc3MetaMap = new Map(
        dc3MetaRecords.map((m) => [m.wp_curso_id, { duracion_horas: m.duracion_horas }])
      )
      pkgCourseMap = new Map(
        pkgCourses.map((c) => [
          c.wp_curso_id,
          { descripcion: c.descripcion, num_lecciones: c.num_lecciones },
        ])
      )
    } catch {}
  }

  const cursosCompletados = cursos.filter((c) => c.completado).length
  const cursosEnProgreso = cursos.filter((c) => !c.completado && c.progreso_pct > 0).length
  const cursosPendientes = cursos.filter((c) => c.progreso_pct === 0).length
  const avancePromedio = cursos.length
    ? Math.round(cursos.reduce((s, c) => s + c.progreso_pct, 0) / cursos.length)
    : 0

  const completadosEnRuta = ruta
    ? ruta.cursos.filter((rc) =>
        cursos.find((c) => c.wp_curso_id === rc.wp_curso_id)?.completado
      ).length
    : 0

  const rutaActiveCourseId = ruta
    ? (ruta.cursos.find(
        (rc) => !cursos.find((c) => c.wp_curso_id === rc.wp_curso_id)?.completado
      )?.wp_curso_id ?? null)
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mi aprendizaje"
        title={`¡Hola, ${empleado.nombre}!`}
        description="Tu ruta de capacitación activa"
      />

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Completados"
          value={String(cursosCompletados)}
          sub={`de ${cursos.length} cursos`}
          icon={CheckCircle}
          borderColor="green"
        />
        <KpiCard
          label="En progreso"
          value={String(cursosEnProgreso)}
          sub="iniciados"
          icon={BookOpen}
          borderColor="amber"
        />
        <KpiCard
          label="Sin iniciar"
          value={String(cursosPendientes)}
          sub="pendientes"
          icon={Clock}
          borderColor="charcoal"
        />
        {/* Avance global: inline para mostrar RingChart visible */}
        <article
          className="relative overflow-hidden rounded-xl bg-white p-5"
          style={{ border: "1px solid #f0f0f0", borderLeft: "4px solid #F5853F" }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#94a3b8]">
            Avance global
          </p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[#1a1a1a]">
            {avancePromedio}%
          </p>
          <p className="mt-1 text-xs text-[#64748b]">promedio</p>
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <RingChart pct={avancePromedio} />
          </div>
        </article>
      </div>

      <EmployeeLearningRefresh autoRefresh pollIntervalMs={15_000} />

      {learningData?.syncError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No pudimos refrescar tu avance. Mostramos el último dato guardado.
        </div>
      ) : null}

      {!learningData?.syncError && learningData?.backgroundSyncQueued ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Verificando tu avance con Tutor LMS. La vista se actualizará automáticamente.
        </div>
      ) : null}

      {/* Banner de ruta de aprendizaje */}
      {ruta && (
        <div className="rounded-xl border border-[#f0f0f0] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5853F]">
                Tu ruta de aprendizaje
              </p>
              <p className="text-sm font-bold text-[#1a1a1a]">{ruta.nombre}</p>
            </div>
            <span className="text-xs text-[#64748b]">
              {completadosEnRuta} de {ruta.cursos.length} completados
            </span>
          </div>
          <div className="flex items-center overflow-x-auto">
            {ruta.cursos.map((rutaCurso, i) => {
              const curso = cursos.find((c) => c.wp_curso_id === rutaCurso.wp_curso_id)
              const completado = curso?.completado ?? false
              const enProgreso = !completado && (curso?.progreso_pct ?? 0) > 0
              const esUltimo = i === ruta.cursos.length - 1
              return (
                <Fragment key={rutaCurso.id}>
                  <div className="flex min-w-0 flex-1 flex-col items-center">
                    <div
                      className={`mb-1 flex size-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                        completado
                          ? "bg-[#22c55e]"
                          : enProgreso
                          ? "bg-[#F5853F]"
                          : "bg-[#e2e8f0]"
                      }`}
                    >
                      {completado ? "✓" : i + 1}
                    </div>
                    <span
                      className={`max-w-[72px] text-center text-[9px] font-semibold leading-tight ${
                        completado
                          ? "text-[#1a1a1a]"
                          : enProgreso
                          ? "text-[#F5853F]"
                          : "text-[#94a3b8]"
                      }`}
                    >
                      {rutaCurso.nombre_curso}
                    </span>
                  </div>
                  {!esUltimo && (
                    <div
                      className={`mb-4 h-0.5 w-6 shrink-0 ${
                        completado ? "bg-[#22c55e]" : "bg-[#e2e8f0]"
                      }`}
                    />
                  )}
                </Fragment>
              )
            })}
          </div>
        </div>
      )}

      {/* Course grid */}
      {cursos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#f0f0f0] bg-white px-4 py-12 text-center text-sm text-[#94a3b8]">
          Aún no tienes cursos sincronizados. Pide a RH o a SuperAdmin que ejecute la
          sincronización.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cursos.map((curso) => {
            const courseUrl = getCourseUrl(curso.wp_curso_id, courseUrlById, fallbackUrlById)
            const launchUrl = buildWordPressCourseLaunchUrl({
              wpUserId: empleado.wp_user_id,
              courseUrl,
            })
            const thumbnail = thumbnailById.get(curso.wp_curso_id)
            const dc3Meta = dc3MetaMap.get(curso.wp_curso_id)
            const pkgMeta = pkgCourseMap.get(curso.wp_curso_id)
            const hasError = curso.acceso_estado === "ERROR"
            const enProgreso = !curso.completado && curso.progreso_pct > 0
            const isRutaActive = rutaActiveCourseId === curso.wp_curso_id
            const barColor =
              curso.completado || enProgreso ? "bg-[#F5853F]" : "bg-[#94a3b8]"
            const duracionLabel = dc3Meta?.duracion_horas
              ? `${Math.round(dc3Meta.duracion_horas)}h`
              : null
            const hasDc3 = !!dc3Meta

            return (
              <article
                key={curso.id}
                className="flex flex-col overflow-hidden rounded-xl bg-white"
                style={{
                  border: `1px solid ${isRutaActive ? "#F5853F" : "#f0f0f0"}`,
                }}
              >
                {/* Thumbnail / placeholder */}
                {thumbnail ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbnail} alt="" className="h-36 w-full object-cover" />
                    {duracionLabel && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {duracionLabel}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="relative flex h-24 items-center justify-center bg-[#fff2eb]">
                    <span className="text-3xl font-extrabold text-[#F5853F] opacity-40">
                      {curso.nombre_curso.charAt(0).toUpperCase()}
                    </span>
                    {duracionLabel && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {duracionLabel}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-1 flex-col p-4">
                  {/* Title + status badge */}
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-sm font-semibold text-[#1a1a1a]">
                      {curso.nombre_curso}
                    </h3>
                    <StatusBadge
                      variant={
                        curso.completado ? "green" : enProgreso ? "amber" : "slate"
                      }
                    >
                      {curso.completado
                        ? "Completado"
                        : enProgreso
                        ? "En progreso"
                        : "Sin iniciar"}
                    </StatusBadge>
                  </div>

                  {/* Description */}
                  {pkgMeta?.descripcion && (
                    <p className="mb-2 line-clamp-2 text-xs text-[#64748b]">
                      {pkgMeta.descripcion}
                    </p>
                  )}

                  {/* Meta row */}
                  {(pkgMeta?.num_lecciones || hasDc3) && (
                    <div className="mb-2 flex gap-3">
                      {pkgMeta?.num_lecciones && (
                        <span className="text-[11px] text-[#94a3b8]">
                          📋 {pkgMeta.num_lecciones} lecciones
                        </span>
                      )}
                      {hasDc3 && (
                        <span className="text-[11px] font-semibold text-[#F5853F]">
                          🏅 DC-3
                        </span>
                      )}
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="mb-1 flex items-center justify-between text-xs text-[#94a3b8]">
                    <span>Avance</span>
                    <span className="font-semibold text-[#1a1a1a]">{curso.progreso_pct}%</span>
                  </div>
                  <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#f0f0f0]">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${curso.progreso_pct}%` }}
                    />
                  </div>

                  {/* Error notice */}
                  {hasError && curso.acceso_error ? (
                    <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">
                      {curso.acceso_error}
                    </p>
                  ) : null}

                  {/* Completion date */}
                  {curso.completado && curso.fecha_completado ? (
                    <p className="mb-3 text-[11px] text-[#94a3b8]">
                      Completado: {formatDateTime(curso.fecha_completado)}
                    </p>
                  ) : null}

                  {/* CTA */}
                  <div className="mt-auto">
                    {launchUrl ? (
                      <a
                        href={launchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold transition ${
                          curso.completado
                            ? "bg-[#F5853F] text-white hover:bg-[#D96B20]"
                            : "bg-[#1a1a1a] text-white hover:bg-[#333]"
                        }`}
                      >
                        {curso.completado ? "Repasar curso" : "Continuar curso"}
                      </a>
                    ) : (
                      <span className="block text-center text-xs text-[#94a3b8]">
                        Sin URL disponible
                      </span>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Constancias banner */}
      {cursosCompletados > 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-[#f0f0f0] bg-white px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fff2eb] text-[#F5853F]">
            <Award size={16} strokeWidth={2} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#1a1a1a]">
              Tienes {cursosCompletados} curso{cursosCompletados > 1 ? "s" : ""} completado
              {cursosCompletados > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-[#64748b]">
              Descarga tus constancias DC-3 oficiales STPS.
            </p>
          </div>
          <a
            href="/empleado/constancias"
            className="shrink-0 rounded-xl bg-[#F5853F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#D96B20]"
          >
            Ver constancias
          </a>
        </div>
      ) : null}
    </div>
  )
}
