import { redirect } from "next/navigation"
import InfoCard from "@/components/portal/InfoCard"
import PageHeader from "@/components/portal/PageHeader"
import StatusNotice from "@/components/portal/StatusNotice"
import { formatDate, formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { readDecodedSearchParam, readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { retryCompanySyncAction, triggerGlobalLearningSyncAction } from "./actions"

const DAY_MS = 1000 * 60 * 60 * 24
const STALE_SYNC_MS = 1000 * 60 * 60 * 24

const successMessages: Record<string, string> = {
  sync_background_started:
    "La sincronizacion global se envio a segundo plano. El portal seguira respondiendo mientras se actualizan cursos, progreso y constancias.",
  sync_background_already_running:
    "Ya existe una sincronizacion global en proceso. Dejamos correr la actual para evitar trabajo duplicado.",
  sync_retry_ok:
    "Se ejecuto el reintento de sincronizacion de la empresa y se actualizo el flujo academico.",
  sync_retry_queue_busy:
    "Se actualizo el acceso del paquete. El refresco de aprendizaje ya estaba en cola para esa empresa.",
  sync_retry_partial:
    "Se lanzo el reintento, pero hubo advertencias en la sincronizacion del paquete. Revisa el detalle para corregir.",
}

const errorMessages: Record<string, string> = {
  sync_retry: "No fue posible ejecutar el reintento de sincronizacion para la empresa seleccionada.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function calculateRemainingDays(date: Date) {
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const target = new Date(date)
  const targetStart = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime()

  return Math.floor((targetStart - startOfToday) / DAY_MS)
}

export default async function SuperAdminReportesPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")
  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")
  const detail = readDecodedSearchParam(params, "detail")

  const [empresas, auditEvents] = await Promise.all([
    prisma.empresa.findMany({
      orderBy: { nombre: "asc" },
      include: {
        paquetes: {
          where: { activo: true },
          orderBy: { created_at: "desc" },
          include: {
            paquete: {
              select: {
                id: true,
                nombre: true,
                modo_entrega: true,
              },
            },
          },
          take: 1,
        },
        empleados: {
          select: {
            id: true,
            activo: true,
            wp_user_id: true,
            cursos: {
              select: {
                progreso_pct: true,
                completado: true,
                acceso_estado: true,
                ultima_sincronizacion: true,
              },
            },
          },
        },
      },
    }),
    prisma.auditoriaEvento.findMany({
      orderBy: { created_at: "desc" },
      take: 40,
    }),
  ])

  const companyNameById = new Map(empresas.map((empresa) => [empresa.id, empresa.nombre]))
  const now = Date.now()

  const companyStats = empresas.map((empresa) => {
    const empleadosActivos = empresa.empleados.filter((empleado) => empleado.activo)
    const empleadosSuspendidos = empresa.empleados.length - empleadosActivos.length
    const employeesWithoutWpUser = empleadosActivos.filter((empleado) => !empleado.wp_user_id).length
    const totalCourses = empleadosActivos.reduce((sum, empleado) => sum + empleado.cursos.length, 0)
    const totalProgress = empleadosActivos.reduce(
      (sum, empleado) =>
        sum + empleado.cursos.reduce((courseSum, curso) => courseSum + curso.progreso_pct, 0),
      0
    )
    const averageProgress = totalCourses ? Math.round(totalProgress / totalCourses) : 0
    const completedCourses = empleadosActivos.reduce(
      (sum, empleado) => sum + empleado.cursos.filter((curso) => curso.completado).length,
      0
    )
    const notStartedCourses = empleadosActivos.reduce(
      (sum, empleado) =>
        sum +
        empleado.cursos.filter((curso) => !curso.completado && curso.progreso_pct === 0).length,
      0
    )
    const errorCourses = empleadosActivos.reduce(
      (sum, empleado) =>
        sum + empleado.cursos.filter((curso) => curso.acceso_estado === "ERROR").length,
      0
    )
    const pendingCourses = empleadosActivos.reduce(
      (sum, empleado) =>
        sum +
        empleado.cursos.filter(
          (curso) =>
            curso.acceso_estado === "PENDING" ||
            curso.acceso_estado === "REQUIRES_REVIEW"
        ).length,
      0
    )
    const staleCourses = empleadosActivos.reduce(
      (sum, empleado) =>
        sum +
        empleado.cursos.filter(
          (curso) => now - new Date(curso.ultima_sincronizacion).getTime() > STALE_SYNC_MS
        ).length,
      0
    )

    const employeesWithoutCourses = empleadosActivos.filter(
      (empleado) => empleado.cursos.length === 0
    ).length

    let syncStatus: "OK" | "PARCIAL" | "ERROR" | "SUSPENDIDA" = "OK"
    if (!empresa.activo) {
      syncStatus = "SUSPENDIDA"
    } else if (errorCourses > 0) {
      syncStatus = "ERROR"
    } else if (
      employeesWithoutWpUser > 0 ||
      pendingCourses > 0 ||
      staleCourses > 0 ||
      (empleadosActivos.length > 0 && totalCourses === 0)
    ) {
      syncStatus = "PARCIAL"
    }

    const activePackage = empresa.paquetes[0]
    const expirationDate = activePackage?.fecha_vencimiento
    const remainingDays = expirationDate ? calculateRemainingDays(new Date(expirationDate)) : null

    return {
      empresa,
      empleadosActivos: empleadosActivos.length,
      empleadosSuspendidos,
      employeesWithoutWpUser,
      totalCourses,
      averageProgress,
      completedCourses,
      notStartedCourses,
      errorCourses,
      pendingCourses,
      staleCourses,
      employeesWithoutCourses,
      syncStatus,
      activePackage,
      remainingDays,
      pctEmployeesWithoutCourses: empleadosActivos.length
        ? Math.round((employeesWithoutCourses / empleadosActivos.length) * 100)
        : 0,
      pctNotStartedCourses: totalCourses
        ? Math.round((notStartedCourses / totalCourses) * 100)
        : 0,
      pctCompletedCourses: totalCourses
        ? Math.round((completedCourses / totalCourses) * 100)
        : 0,
    }
  })

  const empresasActivas = companyStats.filter((item) => item.empresa.activo)
  const totalEmpleadosActivos = empresasActivas.reduce(
    (sum, item) => sum + item.empleadosActivos,
    0
  )
  const totalCursosActivos = empresasActivas.reduce((sum, item) => sum + item.totalCourses, 0)
  const weightedProgress = empresasActivas.reduce(
    (sum, item) => sum + item.averageProgress * item.totalCourses,
    0
  )
  const averageProgress =
    totalCursosActivos > 0 ? Math.round(weightedProgress / totalCursosActivos) : 0
  const companiesWithAccessIssues = empresasActivas.filter(
    (item) => item.syncStatus === "ERROR"
  ).length
  const renewalsIn30Days = empresasActivas.filter(
    (item) => item.remainingDays !== null && item.remainingDays >= 0 && item.remainingDays <= 30
  ).length

  const renewalAlerts = companyStats
    .filter((item) => item.remainingDays !== null && item.remainingDays <= 30)
    .sort((left, right) => (left.remainingDays ?? 0) - (right.remainingDays ?? 0))

  const renewalsOverdue = renewalAlerts.filter((item) => (item.remainingDays ?? 0) < 0).length
  const renewalsIn7 = renewalAlerts.filter(
    (item) => (item.remainingDays ?? 999) >= 0 && (item.remainingDays ?? 999) <= 7
  ).length
  const renewalsIn15 = renewalAlerts.filter(
    (item) => (item.remainingDays ?? 999) >= 8 && (item.remainingDays ?? 999) <= 15
  ).length
  const renewalsIn30 = renewalAlerts.filter(
    (item) => (item.remainingDays ?? 999) >= 16 && (item.remainingDays ?? 999) <= 30
  ).length

  const syncOkCompanies = companyStats.filter((item) => item.syncStatus === "OK").length
  const syncPartialCompanies = companyStats.filter((item) => item.syncStatus === "PARCIAL").length
  const syncErrorCompanies = companyStats.filter((item) => item.syncStatus === "ERROR").length

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SuperAdmin"
        title="Centro de control global"
        description="Vista ejecutiva para vencimientos, semaforo de sincronizacion, salud academica, trazabilidad y seguimiento operativo por empresa."
      />

      {success ? (
        <StatusNotice
          tone="success"
          message={detail ? `${successMessages[success] ?? success} Detalle: ${detail}` : successMessages[success] ?? success}
        />
      ) : null}
      {error ? <StatusNotice tone="error" message={errorMessages[error] ?? error} /> : null}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Sincronizacion global</h2>
            <p className="text-sm leading-6 text-slate-600">
              Ejecuta un refresh en segundo plano para mantener cursos, avances y constancias al dia.
            </p>
          </div>

          <form action={triggerGlobalLearningSyncAction}>
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Actualizar ahora
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <InfoCard
          title="Avance promedio global"
          value={`${averageProgress}%`}
          description="Promedio ponderado entre todos los cursos activos del ecosistema B2B."
          accent="teal"
        />
        <InfoCard
          title="Renovaciones 30 dias"
          value={String(renewalsIn30Days)}
          description="Empresas activas con paquete por vencer dentro de los proximos 30 dias."
          accent="amber"
        />
        <InfoCard
          title="Empresas con error sync"
          value={String(companiesWithAccessIssues)}
          description="Empresas con al menos un curso en estado de error de acceso."
          accent="violet"
        />
        <InfoCard
          title="Empleados activos"
          value={String(totalEmpleadosActivos)}
          description="Base laboral activa que actualmente consume rutas de aprendizaje."
          accent="slate"
        />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h2 className="text-lg font-semibold text-slate-950">Control de vencimientos</h2>
          <p className="text-sm leading-6 text-slate-600">
            Alertas por tramos para anticipar renovaciones comerciales y evitar interrupciones de acceso.
          </p>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-4">
          <InfoCard
            title="Vencidos"
            value={String(renewalsOverdue)}
            description="Empresas que ya superaron su fecha de vigencia."
            accent="violet"
          />
          <InfoCard
            title="0-7 dias"
            value={String(renewalsIn7)}
            description="Requieren atencion prioritaria de renovacion."
            accent="amber"
          />
          <InfoCard
            title="8-15 dias"
            value={String(renewalsIn15)}
            description="Ventana de seguimiento comercial activa."
            accent="teal"
          />
          <InfoCard
            title="16-30 dias"
            value={String(renewalsIn30)}
            description="Pipeline temprano de renovaciones proximas."
            accent="slate"
          />
        </div>

        <div className="space-y-3">
          {renewalAlerts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No hay empresas con vencimiento en los proximos 30 dias.
            </div>
          ) : null}

          {renewalAlerts.map((item) => {
            const remainingDays = item.remainingDays as number
            const toneClass =
              remainingDays < 0
                ? "bg-rose-100 text-rose-900"
                : remainingDays <= 7
                  ? "bg-amber-100 text-amber-900"
                  : "bg-sky-100 text-sky-900"

            return (
              <div key={item.empresa.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-950">{item.empresa.nombre}</p>
                    <p className="text-sm text-slate-600">
                      Paquete: {item.activePackage?.paquete.nombre ?? "Sin paquete activo"} · Vigencia:{" "}
                      {formatDate(item.activePackage?.fecha_vencimiento)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}>
                    {remainingDays < 0
                      ? `Vencido hace ${Math.abs(remainingDays)} dia(s)`
                      : `Vence en ${remainingDays} dia(s)`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h2 className="text-lg font-semibold text-slate-950">Estado de sincronizacion WP/Tutor</h2>
          <p className="text-sm leading-6 text-slate-600">
            Semaforo operativo por empresa con reintento directo para recuperar accesos y datos de aprendizaje.
          </p>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <InfoCard
            title="Estado OK"
            value={String(syncOkCompanies)}
            description="Empresas sin alertas de acceso ni pendientes de sincronizacion."
            accent="teal"
          />
          <InfoCard
            title="Estado parcial"
            value={String(syncPartialCompanies)}
            description="Empresas con pendientes, datos vencidos o usuarios aun sin WP user ID."
            accent="amber"
          />
          <InfoCard
            title="Estado error"
            value={String(syncErrorCompanies)}
            description="Empresas con errores de acceso academico que requieren atencion."
            accent="violet"
          />
        </div>

        <div className="space-y-3">
          {companyStats.map((item) => {
            const badgeClass =
              item.syncStatus === "OK"
                ? "bg-teal-100 text-teal-900"
                : item.syncStatus === "PARCIAL"
                  ? "bg-amber-100 text-amber-900"
                  : item.syncStatus === "ERROR"
                    ? "bg-rose-100 text-rose-900"
                    : "bg-slate-200 text-slate-700"

            return (
              <div key={item.empresa.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-950">{item.empresa.nombre}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
                        {item.syncStatus}
                      </span>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                      <p>
                        <span className="font-medium text-slate-800">Errores:</span>{" "}
                        {item.errorCourses}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Pendientes:</span>{" "}
                        {item.pendingCourses}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Datos vencidos:</span>{" "}
                        {item.staleCourses}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Sin WP user ID:</span>{" "}
                        {item.employeesWithoutWpUser}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Cursos activos:</span>{" "}
                        {item.totalCourses}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Empleados activos:</span>{" "}
                        {item.empleadosActivos}
                      </p>
                    </div>
                  </div>

                  <form action={retryCompanySyncAction}>
                    <input type="hidden" name="empresa_id" value={item.empresa.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Reintentar sync
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h2 className="text-lg font-semibold text-slate-950">Salud academica por empresa</h2>
          <p className="text-sm leading-6 text-slate-600">
            KPIs de aprendizaje para detectar rezagos por cuenta empresarial y priorizar acompañamiento.
          </p>
        </div>

        <div className="space-y-3">
          {companyStats.map((item) => (
            <div key={item.empresa.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2 lg:grid-cols-4">
                <p>
                  <span className="font-medium text-slate-800">Empresa:</span> {item.empresa.nombre}
                </p>
                <p>
                  <span className="font-medium text-slate-800">Promedio avance:</span>{" "}
                  {item.averageProgress}%
                </p>
                <p>
                  <span className="font-medium text-slate-800">Empleados sin cursos:</span>{" "}
                  {item.pctEmployeesWithoutCourses}%
                </p>
                <p>
                  <span className="font-medium text-slate-800">Cursos sin iniciar:</span>{" "}
                  {item.pctNotStartedCourses}%
                </p>
                <p>
                  <span className="font-medium text-slate-800">Cursos completados:</span>{" "}
                  {item.pctCompletedCourses}%
                </p>
                <p>
                  <span className="font-medium text-slate-800">Paquete:</span>{" "}
                  {item.activePackage?.paquete.nombre ?? "Sin paquete activo"}
                </p>
                <p>
                  <span className="font-medium text-slate-800">Cupos usados:</span>{" "}
                  {item.empleadosActivos}/{item.empresa.asientos_contratados}
                </p>
                <p>
                  <span className="font-medium text-slate-800">Suspendidos:</span>{" "}
                  {item.empleadosSuspendidos}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h2 className="text-lg font-semibold text-slate-950">Auditoria reciente</h2>
          <p className="text-sm leading-6 text-slate-600">
            Registro de acciones clave: alta de empresas, asignaciones, suspensiones/reactivaciones y sincronizaciones.
          </p>
        </div>

        <div className="space-y-3">
          {auditEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Aun no hay eventos de auditoria registrados.
            </div>
          ) : null}

          {auditEvents.map((event) => (
            <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2 lg:grid-cols-3">
                <p>
                  <span className="font-medium text-slate-800">Accion:</span> {event.accion}
                </p>
                <p>
                  <span className="font-medium text-slate-800">Actor:</span> {event.actor_nombre} (
                  {event.actor_rol})
                </p>
                <p>
                  <span className="font-medium text-slate-800">Entidad:</span>{" "}
                  {event.entidad_tipo}
                  {event.entidad_id ? ` #${event.entidad_id}` : ""}
                </p>
                <p>
                  <span className="font-medium text-slate-800">Empresa:</span>{" "}
                  {event.empresa_id
                    ? companyNameById.get(event.empresa_id) ?? `Empresa #${event.empresa_id}`
                    : "General"}
                </p>
                <p className="md:col-span-2 lg:col-span-2">
                  <span className="font-medium text-slate-800">Resumen:</span> {event.resumen}
                </p>
              </div>
              <p className="mt-2 text-xs text-slate-500">{formatDateTime(event.created_at)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
