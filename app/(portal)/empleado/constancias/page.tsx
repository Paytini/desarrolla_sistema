import EmployeeLearningRefresh from "@/components/portal/EmployeeLearningRefresh"
import { getEmployeeLearningData } from "@/lib/employee-learning"
import { formatDateTime } from "@/lib/format"
import type { PortalCertificateRecord, PortalCourseRecord } from "@/lib/learning-types"
import { getSession } from "@/lib/session"
import { Award, Clock, FileText, type LucideIcon } from "lucide-react"
import { redirect } from "next/navigation"

function KpiCard({
  label,
  value,
  sub,
  Icon,
  iconCls,
}: {
  label: string
  value: string
  sub?: string
  Icon: LucideIcon
  iconCls: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-950">{value}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
          <Icon size={16} strokeWidth={2} />
        </span>
      </div>
    </div>
  )
}

function Dc3Preview({
  constancia,
  empleadoNombre,
}: {
  constancia: PortalCertificateRecord
  empleadoNombre: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-teal-200 bg-white">
      <div className="bg-teal-600 px-5 py-3 text-center">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-teal-200">
          Secretaría del Trabajo y Previsión Social
        </p>
        <p className="text-sm font-bold text-white">Constancia de Habilidades Laborales</p>
        <p className="text-[10px] text-teal-200">DC-3 Oficial STPS</p>
      </div>
      <div className="space-y-4 p-5">
        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Empleado</p>
          <p className="mt-0.5 text-base font-bold text-slate-950">{empleadoNombre}</p>
        </div>

        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Curso</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-800">{constancia.nombre_curso}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-center text-xs">
          <div>
            <p className="font-medium text-slate-400">Folio</p>
            <p className="mt-0.5 font-mono font-semibold text-slate-800">{constancia.folio}</p>
          </div>
          <div>
            <p className="font-medium text-slate-400">Emisión</p>
            <p className="mt-0.5 font-semibold text-slate-800">
              {formatDateTime(constancia.fecha_emision)}
            </p>
          </div>
        </div>

        <a
          href={`/api/constancias/${constancia.id}/dc3`}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
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
      <header className="space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">
          Mi aprendizaje
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Mis constancias
        </h1>
        <p className="text-sm text-slate-400">Evidencia DC-3 oficial STPS de tus cursos completados</p>
      </header>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Emitidas"
          value={String(constancias.length)}
          sub="Listas para descarga"
          Icon={Award}
          iconCls="bg-teal-50 text-teal-600"
        />
        <KpiCard
          label="Pendientes"
          value={String(pendingCertificates.length)}
          sub="Cursos sin constancia aún"
          Icon={Clock}
          iconCls="bg-amber-50 text-amber-600"
        />
        <KpiCard
          label="Última emisión"
          value={latestConstancia ? formatDateTime(latestConstancia.fecha_emision) : "—"}
          sub={latestConstancia ? latestConstancia.nombre_curso : "Sin constancias aún"}
          Icon={FileText}
          iconCls="bg-slate-100 text-slate-500"
        />
      </div>

      <EmployeeLearningRefresh autoRefresh pollIntervalMs={15_000} />

      {learningData?.syncError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No pudimos refrescar tus constancias. Mostramos el último dato guardado.
        </div>
      ) : null}

      {!learningData?.syncError && learningData?.backgroundSyncQueued ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Verificando constancias con Tutor LMS. La vista se actualizará automáticamente.
        </div>
      ) : null}

      {/* Main content + DC-3 preview */}
      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          {/* Issued constancias */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-950">
              Constancias disponibles
              <span className="ml-2 text-sm font-normal text-slate-400">{constancias.length}</span>
            </h2>

            {constancias.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Aún no hay constancias emitidas para tu perfil.
              </div>
            ) : (
              <div className="space-y-2">
                {constancias.map((constancia) => (
                  <div
                    key={constancia.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50/50"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-xs font-bold text-teal-700">
                      {constancia.nombre_curso.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {constancia.nombre_curso}
                      </p>
                      <p className="text-xs text-slate-500">
                        Folio:{" "}
                        <span className="font-mono">{constancia.folio}</span>
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
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Ver
                        </a>
                      ) : null}
                      <a
                        href={`/api/constancias/${constancia.id}/dc3`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
                      >
                        DC-3
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Pending */}
          {pendingCertificates.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-base font-semibold text-slate-950">
                Pendientes por aparecer
                <span className="ml-2 text-sm font-normal text-slate-400">
                  {pendingCertificates.length}
                </span>
              </h2>
              <div className="space-y-2">
                {pendingCertificates.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3"
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

        {/* DC-3 Preview panel */}
        <aside className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Última DC-3 emitida
          </p>
          {latestConstancia ? (
            <Dc3Preview constancia={latestConstancia} empleadoNombre={empleadoNombre} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-400">
              Sin constancias aún
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
