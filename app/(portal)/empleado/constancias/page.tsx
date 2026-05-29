import KpiCard from "@/components/portal/KpiCard"
import PageHeader from "@/components/portal/PageHeader"
import EmployeeLearningRefresh from "@/components/portal/EmployeeLearningRefresh"
import { getEmployeeLearningData } from "@/lib/employee-learning"
import { formatDateTime } from "@/lib/format"
import type { PortalCertificateRecord, PortalCourseRecord } from "@/lib/learning-types"
import { getSession } from "@/lib/session"
import { Award, Clock, FileText } from "lucide-react"
import { redirect } from "next/navigation"

function Dc3Preview({
  constancia,
  empleadoNombre,
}: {
  constancia: PortalCertificateRecord
  empleadoNombre: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white">
      <div className="bg-[#E8761A] px-5 py-3 text-center">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/70">
          Secretaría del Trabajo y Previsión Social
        </p>
        <p className="text-sm font-bold text-white">Constancia de Habilidades Laborales</p>
        <p className="text-[10px] text-white/70">DC-3 Oficial STPS</p>
      </div>
      <div className="space-y-4 p-5">
        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Empleado</p>
          <p className="mt-0.5 text-base font-bold text-[#1a1a1a]">{empleadoNombre}</p>
        </div>

        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Curso</p>
          <p className="mt-0.5 text-sm font-semibold text-[#1a1a1a]">{constancia.nombre_curso}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-center text-xs">
          <div>
            <p className="font-medium text-slate-400">Folio</p>
            <p className="mt-0.5 font-mono font-semibold text-[#1a1a1a]">{constancia.folio}</p>
          </div>
          <div>
            <p className="font-medium text-slate-400">Emisión</p>
            <p className="mt-0.5 font-semibold text-[#1a1a1a]">
              {formatDateTime(constancia.fecha_emision)}
            </p>
          </div>
        </div>

        <a
          href={`/api/constancias/${constancia.id}/dc3`}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E8761A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#C45F0A]"
        >
          <FileText size={14} strokeWidth={2} />
          Descargar DC-3
        </a>
      </div>
    </div>
  )
}

export default async function EmpleadoConstanciasPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "EMPLEADO" || !session.user.empresa_id) {
    redirect("/login")
  }

  const learningData = await getEmployeeLearningData(session.user.email ?? "")
  const empleado = learningData?.empleado

  if (!empleado) redirect("/login")

  const constancias = (empleado.constancias ?? []) as PortalCertificateRecord[]
  const pendingCertificates = (learningData?.pendingCertificates ?? []) as PortalCourseRecord[]
  const latestConstancia = [...constancias].sort(
    (a, b) => new Date(b.fecha_emision).getTime() - new Date(a.fecha_emision).getTime()
  )[0]

  const empleadoNombre = `${empleado.nombre} ${empleado.apellido ?? ""}`.trim()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mi aprendizaje"
        title="Mis constancias"
        description="Evidencia DC-3 oficial STPS de tus cursos completados"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Emitidas"
          value={String(constancias.length)}
          sub="Listas para descarga"
          icon={Award}
          borderColor="orange"
        />
        <KpiCard
          label="Pendientes"
          value={String(pendingCertificates.length)}
          sub="Cursos sin constancia aún"
          icon={Clock}
          borderColor="amber"
        />
        <KpiCard
          label="Última emisión"
          value={latestConstancia ? formatDateTime(latestConstancia.fecha_emision) : "—"}
          sub={latestConstancia ? latestConstancia.nombre_curso : "Sin constancias aún"}
          icon={FileText}
          borderColor="charcoal"
        />
      </div>

      <EmployeeLearningRefresh autoRefresh pollIntervalMs={15_000} />

      {learningData?.syncError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No pudimos refrescar tus constancias. Mostramos el último dato guardado.
        </div>
      ) : null}

      {!learningData?.syncError && learningData?.backgroundSyncQueued ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Verificando constancias con Tutor LMS. La vista se actualizará automáticamente.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-[#f0f0f0] bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-[#1a1a1a]">
              Constancias disponibles
              <span className="ml-2 text-sm font-normal text-[#94a3b8]">{constancias.length}</span>
            </h2>

            {constancias.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#f0f0f0] bg-[#f8fafc] px-4 py-8 text-center text-sm text-[#94a3b8]">
                Aún no hay constancias emitidas para tu perfil.
              </div>
            ) : (
              <div className="space-y-2">
                {constancias.map((constancia) => (
                  <div
                    key={constancia.id}
                    className="flex items-center gap-3 rounded-xl border border-[#f0f0f0] bg-white px-4 py-3 transition hover:bg-[#f8fafc]"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fff5ed] text-xs font-bold text-[#E8761A]">
                      {constancia.nombre_curso.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#1a1a1a]">
                        {constancia.nombre_curso}
                      </p>
                      <p className="text-xs text-[#64748b]">
                        Folio: <span className="font-mono">{constancia.folio}</span>
                        {" · "}
                        {formatDateTime(constancia.fecha_emision)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {constancia.wp_cert_url ? (
                        <a
                          href={constancia.wp_cert_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-[#f0f0f0] px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] transition hover:bg-[#f8fafc]"
                        >
                          Ver
                        </a>
                      ) : null}
                      <a
                        href={`/api/constancias/${constancia.id}/dc3`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-[#E8761A] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#C45F0A]"
                      >
                        DC-3
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {pendingCertificates.length > 0 ? (
            <section className="rounded-xl border border-[#f0f0f0] bg-white p-5">
              <h2 className="mb-4 text-base font-semibold text-[#1a1a1a]">
                Pendientes por aparecer
                <span className="ml-2 text-sm font-normal text-[#94a3b8]">
                  {pendingCertificates.length}
                </span>
              </h2>
              <div className="space-y-2">
                {pendingCertificates.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xs font-bold text-amber-700">
                      {course.nombre_curso.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-amber-950">
                        {course.nombre_curso}
                      </p>
                      {course.fecha_completado ? (
                        <p className="text-xs text-amber-700">
                          Completado: {formatDateTime(course.fecha_completado)}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                      Pendiente
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
            Última DC-3 emitida
          </p>
          {latestConstancia ? (
            <Dc3Preview constancia={latestConstancia} empleadoNombre={empleadoNombre} />
          ) : (
            <div className="rounded-xl border border-dashed border-[#f0f0f0] bg-white px-5 py-8 text-center text-sm text-[#94a3b8]">
              Sin constancias aún
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
