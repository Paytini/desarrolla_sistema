import { redirect } from "next/navigation"
import { RefreshCw } from "lucide-react"
import InfoCard from "@/components/portal/InfoCard"
import KpiCard from "@/components/portal/KpiCard"
import PageHeader from "@/components/portal/PageHeader"
import StatusBadge from "@/components/portal/StatusBadge"
import StatusNotice from "@/components/portal/StatusNotice"
import { getSuperadminReportesSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"
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

  const { empresas } = await getSuperadminReportesSnapshot()
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operaciones"
        title="Reportes globales"
        description="Vista ejecutiva para vencimientos, sincronización y salud académica por empresa."
        actions={
          <form action={triggerGlobalLearningSyncAction}>
            <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#E8761A] px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-[#C45F0A]">
              <RefreshCw size={14} strokeWidth={2} />
              Sincronizar todo
            </button>
          </form>
        }
      />

      {success ? <StatusNotice tone="success" message={detail ? `${successMessages[success] ?? success} Detalle: ${detail}` : successMessages[success] ?? success} /> : null}
      {error ? <StatusNotice tone="error" message={errorMessages[error] ?? error} /> : null}

      {/* KPI strip global */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Avance promedio global" value={`${averageProgress}%`} sub="Promedio ponderado de cursos activos" borderColor="orange" />
        <KpiCard label="Renovaciones 30 días" value={String(renewalsIn30Days)} sub="Empresas activas por vencer" borderColor="amber" />
        <KpiCard label="Empresas con error sync" value={String(companiesWithAccessIssues)} sub="Requieren atención" borderColor="rose" />
        <KpiCard label="Empleados activos" value={String(totalEmpleadosActivos)} sub="Base laboral activa" borderColor="charcoal" />
      </section>

      {/* Control de vencimientos */}
      <section className="rounded-xl border border-[#f0f0f0] bg-white p-6">
        <h2 className="mb-1 text-[15px] font-bold text-[#1a1a1a]">Control de vencimientos</h2>
        <p className="mb-5 text-sm text-[#64748b]">Alertas por tramos para anticipar renovaciones comerciales.</p>

        <div className="mb-5 grid gap-4 md:grid-cols-4">
          <InfoCard title="Vencidos" value={String(renewalsOverdue)} description="Ya superaron su fecha de vigencia." accent="rose" />
          <InfoCard title="0–7 días" value={String(renewalsIn7)} description="Requieren atención prioritaria." accent="amber" />
          <InfoCard title="8–15 días" value={String(renewalsIn15)} description="Ventana de seguimiento activa." accent="orange" />
          <InfoCard title="16–30 días" value={String(renewalsIn30)} description="Pipeline temprano de renovaciones." accent="slate" />
        </div>

        <div className="space-y-2.5">
          {renewalAlerts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-6 text-sm text-[#94a3b8]">
              No hay empresas con vencimiento en los próximos 30 días.
            </div>
          ) : null}
          {renewalAlerts.map((item) => {
            const remainingDays = item.remainingDays as number
            const badgeCls =
              remainingDays < 0 ? "bg-rose-100 text-rose-700"
              : remainingDays <= 7 ? "bg-amber-100 text-amber-700"
              : "bg-[#fff5ed] text-[#C45F0A]"
            return (
              <div key={item.empresa.id} className="flex items-center justify-between rounded-xl border border-[#f0f0f0] bg-[#f8fafc] px-4 py-3">
                <div>
                  <p className="text-[13.5px] font-semibold text-[#1a1a1a]">{item.empresa.nombre}</p>
                  <p className="text-[12px] text-[#64748b]">
                    {item.activePackage?.paquete.nombre ?? "Sin paquete"} · {formatDate(item.activePackage?.fecha_vencimiento)}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeCls}`}>
                  {remainingDays < 0 ? `Vencido hace ${Math.abs(remainingDays)}d` : `Vence en ${remainingDays}d`}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Estado de sync WP */}
      <section className="rounded-xl border border-[#f0f0f0] bg-white p-6">
        <h2 className="mb-1 text-[15px] font-bold text-[#1a1a1a]">Estado de sincronización WP/Tutor</h2>
        <p className="mb-5 text-sm text-[#64748b]">Semáforo operativo por empresa con reintento directo.</p>

        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <InfoCard title="Estado OK" value={String(syncOkCompanies)} description="Sin alertas ni pendientes de sync." accent="orange" />
          <InfoCard title="Estado parcial" value={String(syncPartialCompanies)} description="Con pendientes o datos vencidos." accent="amber" />
          <InfoCard title="Estado error" value={String(syncErrorCompanies)} description="Errores de acceso académico." accent="rose" />
        </div>

        <div className="space-y-2.5">
          {companyStats.map((item) => {
            const badgeVariant =
              item.syncStatus === "OK" ? "green"
              : item.syncStatus === "PARCIAL" ? "amber"
              : item.syncStatus === "ERROR" ? "red"
              : "slate"

            return (
              <div key={item.empresa.id} className="rounded-xl border border-[#f0f0f0] bg-[#f8fafc] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-bold text-[#1a1a1a]">{item.empresa.nombre}</p>
                      <StatusBadge variant={badgeVariant}>{item.syncStatus}</StatusBadge>
                    </div>
                    <div className="grid gap-1.5 text-[13px] text-[#64748b] md:grid-cols-3">
                      <p><span className="font-semibold text-[#1a1a1a]">Errores:</span> {item.errorCourses}</p>
                      <p><span className="font-semibold text-[#1a1a1a]">Pendientes:</span> {item.pendingCourses}</p>
                      <p><span className="font-semibold text-[#1a1a1a]">Datos vencidos:</span> {item.staleCourses}</p>
                      <p><span className="font-semibold text-[#1a1a1a]">Sin WP user ID:</span> {item.employeesWithoutWpUser}</p>
                      <p><span className="font-semibold text-[#1a1a1a]">Cursos activos:</span> {item.totalCourses}</p>
                      <p><span className="font-semibold text-[#1a1a1a]">Empleados activos:</span> {item.empleadosActivos}</p>
                    </div>
                  </div>
                  <form action={retryCompanySyncAction}>
                    <input type="hidden" name="empresa_id" value={item.empresa.id} />
                    <button type="submit" className="rounded-lg bg-[#1a1a1a] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#333]">
                      Reintentar sync
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
