import InfoCard from "@/components/portal/InfoCard"
import PageHeader from "@/components/portal/PageHeader"
import { getEmployeeLearningData } from "@/lib/employee-learning"
import { formatDate, formatDateTime } from "@/lib/format"
import type { PortalCourseRecord } from "@/lib/learning-types"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

export default async function EmpleadoProgresoPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "EMPLEADO" || !session.user.empresa_id) {
    redirect("/login")
  }

  const learningData = await getEmployeeLearningData(session.user.email ?? "")
  const empleado = learningData?.empleado

  if (!empleado) {
    redirect("/login")
  }

  const cursos = empleado.cursos as PortalCourseRecord[]
  const cursosCompletados = cursos.filter((curso) => curso.completado)
  const cursosEnProgreso = cursos.filter((curso) => !curso.completado && curso.progreso_pct > 0)
  const cursosSinIniciar = cursos.filter((curso) => curso.progreso_pct === 0)
  const avancePromedio = cursos.length
    ? Math.round(cursos.reduce((sum, curso) => sum + curso.progreso_pct, 0) / cursos.length)
    : 0
  const ultimoMovimiento = [...cursos]
    .filter((curso) => curso.fecha_completado || curso.fecha_inicio_curso || curso.ultima_sincronizacion)
    .sort(
      (a, b) =>
        new Date(
          b.fecha_completado ?? b.fecha_inicio_curso ?? b.ultima_sincronizacion
        ).getTime() -
        new Date(
          a.fecha_completado ?? a.fecha_inicio_curso ?? a.ultima_sincronizacion
        ).getTime()
    )[0]

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Empleado"
        title="Mi progreso y trayectoria"
        description="Aqui puedes revisar tu avance real por curso, lo que ya completaste y los temas que siguen pendientes dentro de tu ruta actual."
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <InfoCard
          title="Avance promedio"
          value={`${avancePromedio}%`}
          description="Promedio actual de avance entre todos tus cursos asignados."
          accent="violet"
        />
        <InfoCard
          title="Completados"
          value={String(cursosCompletados.length)}
          description="Cursos que ya cerraste y cuentan como terminados."
          accent="teal"
        />
        <InfoCard
          title="En progreso"
          value={String(cursosEnProgreso.length)}
          description="Cursos con actividad registrada y avance parcial."
          accent="amber"
        />
        <InfoCard
          title="Sin iniciar"
          value={String(cursosSinIniciar.length)}
          description="Cursos disponibles a los que aun no entras o no registran actividad."
          accent="slate"
        />
      </section>

      {learningData?.syncError ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
          No pudimos refrescar tu progreso en este momento. Mostramos el ultimo estado guardado en el portal.
        </section>
      ) : null}

      {!learningData?.syncError && learningData?.backgroundSyncQueued ? (
        <section className="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm leading-6 text-sky-900">
          Tu progreso se esta actualizando en segundo plano. Mientras tanto, mostramos el ultimo estado sincronizado.
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">Mapa de avance</h2>
            <p className="text-sm leading-6 text-slate-600">
              Vista consolidada de toda tu ruta formativa con porcentajes y fechas clave.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {cursos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Aun no tienes cursos asignados para mostrar progreso.
              </div>
            ) : null}

            {cursos.map((curso) => {
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

              return (
                <article
                  key={curso.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-slate-950">{curso.nombre_curso}</h3>
                      <p className="text-sm text-slate-500">Curso ID {curso.wp_curso_id}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Progreso registrado</span>
                      <span className="font-medium text-slate-900">{curso.progreso_pct}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${curso.completado ? "bg-teal-600" : "bg-violet-600"}`}
                        style={{ width: `${curso.progreso_pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                    <p>
                      <span className="font-medium text-slate-800">Inicio:</span>{" "}
                      {formatDateTime(curso.fecha_inicio_curso)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">Completado:</span>{" "}
                      {formatDateTime(curso.fecha_completado)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">Ultima sincronizacion:</span>{" "}
                      {formatDateTime(curso.ultima_sincronizacion)}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        </article>

        <div className="space-y-6">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-950">Resumen personal</h2>
              <p className="text-sm leading-6 text-slate-600">
                Indicadores rapidos para saber en que parte de tu ruta te encuentras.
              </p>
            </div>

            <div className="mt-5 space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-medium text-slate-900">Ultimo movimiento registrado</p>
                <p className="mt-1">
                  {ultimoMovimiento
                    ? `${ultimoMovimiento.nombre_curso} - ${formatDate(
                        ultimoMovimiento.fecha_completado ??
                          ultimoMovimiento.fecha_inicio_curso ??
                          ultimoMovimiento.ultima_sincronizacion
                      )}`
                    : "Sin actividad aun"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-medium text-slate-900">Constancias disponibles</p>
                <p className="mt-1">
                  {empleado.constancias.length} emitidas y {learningData?.pendingCertificates.length ?? 0} pendientes de aparicion en el portal.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-medium text-slate-900">Cursos con acceso activo</p>
                <p className="mt-1">
                  {cursos.filter((curso) => curso.acceso_estado === "ACTIVE").length} de {cursos.length} sincronizados correctamente.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-950">Siguientes objetivos</h2>
              <p className="text-sm leading-6 text-slate-600">
                Prioridades sugeridas segun tu avance actual.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {cursosSinIniciar.slice(0, 3).map((curso) => (
                <div
                  key={curso.id}
                  className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-700"
                >
                  <p className="font-medium text-slate-900">{curso.nombre_curso}</p>
                  <p className="mt-1">Aun no registra avance. Ideal para comenzar cuanto antes.</p>
                </div>
              ))}

              {cursosSinIniciar.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                  Tu ruta ya no tiene cursos totalmente detenidos. Sigue con los que ya estan en progreso.
                </div>
              ) : null}
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
