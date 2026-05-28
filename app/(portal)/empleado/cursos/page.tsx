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
  const color = pct >= 80 ? "#0d9488" : pct >= 40 ? "#f59e0b" : "#f43f5e"
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" aria-hidden="true">
      <circle cx={36} cy={36} r={r} fill="none" stroke="#e2e8f0" strokeWidth={7} />
      <circle
        cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
      />
      <text x={36} y={40} textAnchor="middle" fill="#0f172a" fontSize={13} fontWeight={700}>
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
          .map((c) => [c.wp_course_id, `${siteUrl}/?post_type=${c.post_type}&p=${c.wp_course_id}`])
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
  const cursosCompletados = cursos.filter((c) => c.completado).length
  const cursosEnProgreso = cursos.filter((c) => !c.completado && c.progreso_pct > 0).length
  const cursosPendientes = cursos.filter((c) => c.progreso_pct === 0).length
  const avancePromedio = cursos.length
    ? Math.round(cursos.reduce((s, c) => s + c.progreso_pct, 0) / cursos.length)
    : 0

  return (
    <div className="space-y-6">
      <header className="space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">
          Mi aprendizaje
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Hola, {empleado.nombre}!
        </h1>
        <p className="text-sm text-slate-400">Tu ruta de capacitación activa</p>
      </header>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-slate-500">Completados</p>
              <p className="text-2xl font-bold tracking-tight text-slate-950">{cursosCompletados}</p>
              <p className="text-xs text-slate-400">de {cursos.length} cursos</p>
            </div>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <CheckCircle size={16} strokeWidth={2} />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-slate-500">En progreso</p>
              <p className="text-2xl font-bold tracking-tight text-slate-950">{cursosEnProgreso}</p>
              <p className="text-xs text-slate-400">iniciados</p>
            </div>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <BookOpen size={16} strokeWidth={2} />
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-slate-500">Sin iniciar</p>
              <p className="text-2xl font-bold tracking-tight text-slate-950">{cursosPendientes}</p>
              <p className="text-xs text-slate-400">pendientes</p>
            </div>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Clock size={16} strokeWidth={2} />
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-slate-500">Avance global</p>
            <p className="text-2xl font-bold tracking-tight text-slate-950">{avancePromedio}%</p>
            <p className="text-xs text-slate-400">promedio</p>
          </div>
          <RingChart pct={avancePromedio} />
        </div>
      </div>

      <EmployeeLearningRefresh autoRefresh pollIntervalMs={15_000} />

      {learningData?.syncError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No pudimos refrescar tu avance. Mostramos el último dato guardado.
        </div>
      ) : null}

      {!learningData?.syncError && learningData?.backgroundSyncQueued ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Verificando tu avance con Tutor LMS. La vista se actualizará automáticamente.
        </div>
      ) : null}

      {/* Course grid */}
      {cursos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
          Aún no tienes cursos sincronizados. Pide a RH o a SuperAdmin que ejecute la sincronización.
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

            const statusLabel = curso.completado
              ? "Completado"
              : curso.progreso_pct > 0
                ? "En progreso"
                : "Sin iniciar"
            const statusClasses = curso.completado
              ? "bg-teal-100 text-teal-800"
              : curso.progreso_pct > 0
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-600"
            const barColor = curso.completado ? "bg-teal-600" : "bg-violet-600"
            const hasError = curso.acceso_estado === "ERROR"

            return (
              <article
                key={curso.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                {/* Thumbnail / placeholder */}
                {thumbnail ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={thumbnail} alt="" className="h-36 w-full object-cover" />
                ) : (
                  <div className="flex h-24 items-center justify-center bg-slate-100">
                    <span className="text-3xl font-bold text-slate-300">
                      {curso.nombre_curso.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-4">
                  {/* Title + badge */}
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-sm font-semibold text-slate-950">
                      {curso.nombre_curso}
                    </h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClasses}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Avance</span>
                    <span className="font-semibold text-slate-800">{curso.progreso_pct}%</span>
                  </div>
                  <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
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

                  {/* Fecha completado (solo si completó) */}
                  {curso.completado && curso.fecha_completado ? (
                    <p className="mb-3 text-[11px] text-slate-400">
                      Completado: {formatDateTime(curso.fecha_completado)}
                    </p>
                  ) : null}

                  {/* CTA — pushed to bottom */}
                  <div className="mt-auto">
                    {launchUrl ? (
                      <a
                        href={launchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold transition ${
                          curso.completado
                            ? "bg-teal-600 text-white hover:bg-teal-700"
                            : "bg-slate-900 text-white hover:bg-slate-700"
                        }`}
                      >
                        {curso.completado ? "Repasar curso" : "Continuar curso"}
                      </a>
                    ) : (
                      <span className="block text-center text-xs text-slate-400">
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

      {/* Constancias quick link */}
      {cursosCompletados > 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <Award size={16} strokeWidth={2} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-teal-900">
              Tienes {cursosCompletados} curso{cursosCompletados > 1 ? "s" : ""} completado{cursosCompletados > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-teal-700">Descarga tus constancias DC-3 oficiales STPS.</p>
          </div>
          <a
            href="/empleado/constancias"
            className="shrink-0 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Ver constancias
          </a>
        </div>
      ) : null}
    </div>
  )
}
