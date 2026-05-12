import InfoCard from "@/components/portal/InfoCard"
import EmployeeLearningRefresh from "@/components/portal/EmployeeLearningRefresh"
import PageHeader from "@/components/portal/PageHeader"
import { getEmployeeLearningData } from "@/lib/employee-learning"
import { formatDateTime } from "@/lib/format"
import type { PortalCourseRecord } from "@/lib/learning-types"
import { getSession } from "@/lib/session"
import { getWordPressCourseCatalog } from "@/lib/wordpress-course-catalog"
import {
  buildWordPressCourseLaunchUrl,
  getWordPressSiteUrl,
  isWordPressBridgeConfigured,
} from "@/lib/wordpress-bridge"
import { redirect } from "next/navigation"

function getCourseUrl(
  courseId: number,
  courseUrlById: Map<number, string>,
  fallbackUrlById: Map<number, string>
) {
  const courseUrl = courseUrlById.get(courseId)
  if (courseUrl) {
    return courseUrl
  }

  const fallbackUrl = fallbackUrlById.get(courseId)
  if (fallbackUrl) {
    return fallbackUrl
  }

  const siteUrl = getWordPressSiteUrl()
  if (!siteUrl) {
    return null
  }

  return `${siteUrl}/?p=${courseId}`
}

export default async function EmpleadoCursos() {
  const session = await getSession()
  if (!session || session.user.rol !== "EMPLEADO" || !session.user.empresa_id) {
    redirect("/login")
  }

  const learningData = await getEmployeeLearningData(session.user.email ?? "")
  const empleado = learningData?.empleado

  if (!empleado) {
    redirect("/login")
  }

  let courseUrlById = new Map<number, string>()
  let fallbackUrlById = new Map<number, string>()

  if (isWordPressBridgeConfigured()) {
    try {
      const bridgeCourses = await getWordPressCourseCatalog()

      courseUrlById = new Map(
        bridgeCourses.courses
          .filter((course) => course.course_url)
          .map((course) => [course.wp_course_id, course.course_url as string])
      )

      const siteUrl = getWordPressSiteUrl()
      fallbackUrlById = new Map(
        bridgeCourses.courses
          .filter((course) => course.post_type && siteUrl)
          .map((course) => [
            course.wp_course_id,
            `${siteUrl}/?post_type=${course.post_type}&p=${course.wp_course_id}`,
          ])
      )
    } catch {
    }
  }

  const cursos = empleado.cursos as PortalCourseRecord[]
  const cursosAsignados = cursos.length
  const cursosCompletados = cursos.filter((curso) => curso.completado).length
  const cursosPendientes = cursos.filter((curso) => !curso.completado).length
  const avancePromedio = cursos.length
    ? Math.round(cursos.reduce((sum, curso) => sum + curso.progreso_pct, 0) / cursos.length)
    : 0

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Empleado"
        title="Mis cursos y pendientes"
        description="Aqui ya puedes ver los cursos sincronizados desde Tutor LMS, el avance real de cada uno y un acceso directo al contenido academico."
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <InfoCard
          title="Cursos asignados"
          value={String(cursosAsignados)}
          description="Total de cursos vinculados a tu ruta actual."
          accent="amber"
        />
        <InfoCard
          title="Cursos completados"
          value={String(cursosCompletados)}
          description="Cursos concluidos y listos para constancia si aplica."
          accent="teal"
        />
        <InfoCard
          title="Pendientes"
          value={String(cursosPendientes)}
          description="Cursos aun no terminados dentro de tu paquete activo."
          accent="violet"
        />
        <InfoCard
          title="Avance promedio"
          value={`${avancePromedio}%`}
          description="Promedio actual de avance entre todos tus cursos sincronizados."
          accent="slate"
        />
      </section>

      <EmployeeLearningRefresh autoRefresh={Boolean(learningData?.backgroundSyncQueued)} />

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h2 className="text-lg font-semibold text-slate-950">Ruta actual</h2>
          <p className="text-sm leading-6 text-slate-600">
            Cada tarjeta refleja el estado almacenado en el portal y la ultima sincronizacion con WordPress/Tutor LMS.
          </p>
        </div>

        {learningData?.syncError ? (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            No pudimos refrescar tu avance en este momento. Mostramos el ultimo dato guardado en el portal.
          </div>
        ) : null}

        {!learningData?.syncError && learningData?.backgroundSyncQueued ? (
          <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">
            Estamos verificando tu avance con Tutor LMS. Si hay cambios recientes, la vista se actualizara automaticamente.
          </div>
        ) : null}

        <div className="space-y-4">
          {cursos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Aun no tienes cursos sincronizados. Si ya te asignaron un paquete, pide a RH o a SuperAdmin que ejecute la sincronizacion.
            </div>
          ) : null}

          {cursos.map((curso) => {
            const courseUrl = getCourseUrl(curso.wp_curso_id, courseUrlById, fallbackUrlById)
            const launchUrl = buildWordPressCourseLaunchUrl({
              wpUserId: empleado.wp_user_id,
              courseUrl,
            })
            const accessLabel =
              curso.acceso_estado === "ACTIVE"
                ? "Acceso activo"
                : curso.acceso_estado === "ERROR"
                  ? "Requiere revision"
                  : "Sin confirmar"
            const statusLabel = curso.completado
              ? "Completado"
              : curso.progreso_pct > 0
                ? "En progreso"
                : "Sin iniciar"

            const statusClasses = curso.completado
              ? "bg-teal-100 text-teal-900"
              : curso.progreso_pct > 0
                ? "bg-amber-100 text-amber-900"
                : "bg-slate-200 text-slate-700"
            const accessClasses =
              curso.acceso_estado === "ACTIVE"
                ? "bg-emerald-100 text-emerald-900"
                : curso.acceso_estado === "ERROR"
                  ? "bg-rose-100 text-rose-900"
                  : "bg-slate-200 text-slate-700"

            return (
              <article
                key={curso.id}
                className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-slate-950">{curso.nombre_curso}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses}`}>
                        {statusLabel}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${accessClasses}`}>
                        {accessLabel}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>Avance</span>
                        <span className="font-medium text-slate-900">{curso.progreso_pct}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all ${
                            curso.completado ? "bg-teal-600" : "bg-violet-600"
                          }`}
                          style={{ width: `${curso.progreso_pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p>
                        <span className="font-medium text-slate-800">Curso ID:</span> {curso.wp_curso_id}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Ultima sincronizacion:</span>{" "}
                        {formatDateTime(curso.ultima_sincronizacion)}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Inicio:</span>{" "}
                        {formatDateTime(curso.fecha_inicio_curso)}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Completado:</span>{" "}
                        {formatDateTime(curso.fecha_completado)}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Entrega B2B:</span>{" "}
                        {curso.acceso_origen === "PRIVATE_BUNDLE_REFERENCE"
                          ? "Bundle privado + matricula directa"
                          : "Matricula directa por curso"}
                      </p>
                    </div>

                    {curso.acceso_estado === "ERROR" && curso.acceso_error ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
                        <span className="font-medium">Acceso pendiente de revision:</span>{" "}
                        {curso.acceso_error}
                      </div>
                    ) : null}
                  </div>

                  {launchUrl ? (
                    <a
                      href={launchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Abrir en Tutor LMS
                    </a>
                  ) : (
                    <span className="text-sm text-slate-400">
                      El empleado necesita sincronizacion de WordPress o una URL valida del curso para abrir Tutor LMS.
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
