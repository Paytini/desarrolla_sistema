import InfoCard from "@/components/portal/InfoCard"
import EmployeeLearningRefresh from "@/components/portal/EmployeeLearningRefresh"
import PageHeader from "@/components/portal/PageHeader"
import { getEmployeeLearningData } from "@/lib/employee-learning"
import { formatDate, formatDateTime } from "@/lib/format"
import type { PortalCertificateRecord, PortalCourseRecord } from "@/lib/learning-types"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

type EmployeeLearningRecord = {
  cursos: PortalCourseRecord[]
  constancias: PortalCertificateRecord[]
}
type EmployeeCertificate = PortalCertificateRecord
type EmployeeCourse = PortalCourseRecord

export default async function EmpleadoConstanciasPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "EMPLEADO" || !session.user.empresa_id) {
    redirect("/login")
  }

  const learningData = await getEmployeeLearningData(session.user.email ?? "")
  const empleado = learningData?.empleado as EmployeeLearningRecord | undefined

  if (!empleado) {
    redirect("/login")
  }

  const constancias: EmployeeCertificate[] = empleado.constancias
  const pendingCertificates: EmployeeCourse[] = (learningData?.pendingCertificates ?? []) as EmployeeCourse[]
  const latestIssued = constancias[0]

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Empleado"
        title="Mis constancias"
        description="Aqui puedes revisar las constancias ya emitidas por Tutor LMS y detectar cursos completados cuya evidencia todavia no aparece en el portal."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoCard
          title="Emitidas"
          value={String(constancias.length)}
          description="Constancias sincronizadas y listas para consulta o descarga."
          accent="teal"
        />
        <InfoCard
          title="Pendientes"
          value={String(pendingCertificates.length)}
          description="Cursos completados que aun no exponen constancia en el bridge."
          accent="amber"
        />
        <InfoCard
          title="Ultima emision"
          value={latestIssued ? formatDate(latestIssued.fecha_emision) : "Sin constancias"}
          description="Fecha de la constancia mas reciente visible en tu portal."
          accent="violet"
        />
      </section>

      <EmployeeLearningRefresh autoRefresh pollIntervalMs={15_000} />

      {learningData?.syncError ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
          No pudimos refrescar tus constancias en este momento. Mostramos el ultimo estado guardado en el portal.
        </section>
      ) : null}

      {!learningData?.syncError && learningData?.backgroundSyncQueued ? (
        <section className="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm leading-6 text-sky-900">
          Tus constancias se estan verificando con Tutor LMS. Si hay cambios recientes, la vista se actualizara automaticamente.
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">Constancias disponibles</h2>
            <p className="text-sm leading-6 text-slate-600">
              Historial de evidencia academica emitida y sincronizada para tu perfil.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {constancias.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Aun no hay constancias disponibles en tu portal.
              </div>
            ) : null}

            {constancias.map((constancia: EmployeeCertificate) => (
              <article
                key={constancia.id}
                className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{constancia.nombre_curso}</h3>
                      <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900">
                        Emitida
                      </span>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p>
                        <span className="font-medium text-slate-800">Folio:</span> {constancia.folio}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Emitida:</span>{" "}
                        {formatDateTime(constancia.fecha_emision)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {constancia.wp_cert_url ? (
                      <a
                        href={constancia.wp_cert_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Ver constancia
                      </a>
                    ) : (
                      <span className="self-center text-sm text-slate-400">
                        Sin URL publica de Tutor
                      </span>
                    )}
                    <a
                      href={`/api/constancias/${constancia.id}/dc3`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                    >
                      Ver DC-3
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>

        <div className="space-y-6">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-950">Pendientes por aparecer</h2>
              <p className="text-sm leading-6 text-slate-600">
                Cursos que ya figuran como completados, pero cuya constancia aun no llega desde Tutor LMS.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {pendingCertificates.map((course: EmployeeCourse) => (
                <div
                  key={course.id}
                  className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                >
                  <p className="font-medium">{course.nombre_curso}</p>
                  <p className="mt-1">
                    Completado: {formatDateTime(course.fecha_completado)}. La constancia todavia no se refleja en el bridge.
                  </p>
                </div>
              ))}

              {pendingCertificates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                  No hay constancias pendientes. Todo lo emitido ya se ve reflejado aqui.
                </div>
              ) : null}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-950">Historial academico</h2>
              <p className="text-sm leading-6 text-slate-600">
                Resumen simple para consultar logros y actividad reciente.
              </p>
            </div>

            <div className="mt-5 space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-medium text-slate-900">Cursos completados</p>
                <p className="mt-1">{empleado.cursos.filter((course: EmployeeCourse) => course.completado).length} registrados en tu perfil.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-medium text-slate-900">Ultima sincronizacion</p>
                <p className="mt-1">
                  {empleado.cursos[0]
                    ? formatDateTime(
                        [...empleado.cursos]
                          .sort(
                            (a: EmployeeCourse, b: EmployeeCourse) =>
                              new Date(b.ultima_sincronizacion).getTime() -
                              new Date(a.ultima_sincronizacion).getTime()
                          )[0].ultima_sincronizacion
                      )
                    : "Sin sincronizacion aun"}
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
