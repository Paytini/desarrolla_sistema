import { redirect } from "next/navigation"
import { RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import KpiCard from "@/components/portal/KpiCard"
import { getSuperadminReportesSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"
import { readDecodedSearchParam, readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { retryCompanySyncAction, triggerGlobalLearningSyncAction } from "./actions"

const DAY_MS = 1000 * 60 * 60 * 24
const STALE_SYNC_MS = 1000 * 60 * 60 * 24

const successMessages: Record<string, string> = {
  sync_background_started: "La sincronización global se envió a segundo plano.",
  sync_background_already_running: "Ya existe una sincronización global en proceso.",
  sync_retry_ok: "Se ejecutó el reintento de sincronización de la empresa.",
  sync_retry_queue_busy: "Se actualizó el acceso del paquete. El refresco ya estaba en cola.",
  sync_retry_partial: "Se lanzó el reintento, pero hubo advertencias. Revisa el detalle.",
}

const errorMessages: Record<string, string> = {
  sync_retry: "No fue posible ejecutar el reintento para la empresa seleccionada.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function calculateRemainingDays(date: Date) {
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const target = new Date(date)
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  return Math.floor((targetStart - startOfToday) / DAY_MS)
}

function SyncBadge({ status }: { status: "OK" | "PARCIAL" | "ERROR" | "SUSPENDIDA" }) {
  const map: Record<typeof status, string> = {
    OK: "border-green-200 bg-green-50 text-green-700 hover:bg-green-50",
    PARCIAL: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50",
    ERROR: "border-red-200 bg-red-50 text-red-600 hover:bg-red-50",
    SUSPENDIDA: "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-100",
  }
  return <Badge className={map[status]}>{status}</Badge>
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
    const empleadosActivos = empresa.empleados.filter((e) => e.activo)
    const empleadosSuspendidos = empresa.empleados.length - empleadosActivos.length
    const employeesWithoutWpUser = empleadosActivos.filter((e) => !e.wp_user_id).length
    const totalCourses = empleadosActivos.reduce((s, e) => s + e.cursos.length, 0)
    const totalProgress = empleadosActivos.reduce(
      (s, e) => s + e.cursos.reduce((cs, c) => cs + c.progreso_pct, 0), 0
    )
    const averageProgress = totalCourses ? Math.round(totalProgress / totalCourses) : 0
    const completedCourses = empleadosActivos.reduce(
      (s, e) => s + e.cursos.filter((c) => c.completado).length, 0
    )
    const notStartedCourses = empleadosActivos.reduce(
      (s, e) => s + e.cursos.filter((c) => !c.completado && c.progreso_pct === 0).length, 0
    )
    const errorCourses = empleadosActivos.reduce(
      (s, e) => s + e.cursos.filter((c) => c.acceso_estado === "ERROR").length, 0
    )
    const pendingCourses = empleadosActivos.reduce(
      (s, e) => s + e.cursos.filter((c) => c.acceso_estado === "PENDING" || c.acceso_estado === "REQUIRES_REVIEW").length, 0
    )
    const staleCourses = empleadosActivos.reduce(
      (s, e) => s + e.cursos.filter((c) => now - new Date(c.ultima_sincronizacion).getTime() > STALE_SYNC_MS).length, 0
    )
    const employeesWithoutCourses = empleadosActivos.filter((e) => e.cursos.length === 0).length

    let syncStatus: "OK" | "PARCIAL" | "ERROR" | "SUSPENDIDA" = "OK"
    if (!empresa.activo) syncStatus = "SUSPENDIDA"
    else if (errorCourses > 0) syncStatus = "ERROR"
    else if (
      employeesWithoutWpUser > 0 ||
      pendingCourses > 0 ||
      staleCourses > 0 ||
      (empleadosActivos.length > 0 && totalCourses === 0)
    )
      syncStatus = "PARCIAL"

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

  const empresasActivas = companyStats.filter((i) => i.empresa.activo)
  const totalEmpleadosActivos = empresasActivas.reduce((s, i) => s + i.empleadosActivos, 0)
  const totalCursosActivos = empresasActivas.reduce((s, i) => s + i.totalCourses, 0)
  const weightedProgress = empresasActivas.reduce(
    (s, i) => s + i.averageProgress * i.totalCourses, 0
  )
  const averageProgress = totalCursosActivos > 0
    ? Math.round(weightedProgress / totalCursosActivos)
    : 0
  const companiesWithErrors = empresasActivas.filter((i) => i.syncStatus === "ERROR").length
  const renewalsIn30Days = empresasActivas.filter(
    (i) => i.remainingDays !== null && i.remainingDays >= 0 && i.remainingDays <= 30
  ).length

  const renewalAlerts = companyStats
    .filter((i) => i.remainingDays !== null && i.remainingDays <= 30)
    .sort((a, b) => (a.remainingDays ?? 0) - (b.remainingDays ?? 0))

  const renewalsOverdue  = renewalAlerts.filter((i) => (i.remainingDays ?? 0) < 0).length
  const renewalsIn7      = renewalAlerts.filter((i) => (i.remainingDays ?? 999) >= 0 && (i.remainingDays ?? 999) <= 7).length
  const renewalsIn15     = renewalAlerts.filter((i) => (i.remainingDays ?? 999) >= 8 && (i.remainingDays ?? 999) <= 15).length
  const renewalsIn30     = renewalAlerts.filter((i) => (i.remainingDays ?? 999) >= 16 && (i.remainingDays ?? 999) <= 30).length

  const syncOk      = companyStats.filter((i) => i.syncStatus === "OK").length
  const syncPartial = companyStats.filter((i) => i.syncStatus === "PARCIAL").length
  const syncError   = companyStats.filter((i) => i.syncStatus === "ERROR").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">
            SuperAdmin · Operaciones
          </p>
          <h1 className="mt-1 text-[24px] font-semibold leading-tight text-slate-950">
            Reportes globales
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-400">
            Vista ejecutiva de vencimientos, sincronización y salud académica por empresa.
          </p>
        </div>
        <form action={triggerGlobalLearningSyncAction} className="shrink-0">
          <Button type="submit" className="gap-2" style={{ background: "#3730a3" }}>
            <RefreshCw size={14} strokeWidth={2} />
            Sincronizar todo
          </Button>
        </form>
      </div>

      {/* Alerts */}
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="size-4" />
          <AlertDescription>
            {detail
              ? `${successMessages[success] ?? success} — ${detail}`
              : (successMessages[success] ?? success)}
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{errorMessages[error] ?? error}</AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Avance promedio global"
          value={`${averageProgress}%`}
          sub="Promedio ponderado de cursos"
          borderColor="primary"
        />
        <KpiCard
          label="Renovaciones en 30 d"
          value={renewalsIn30Days}
          sub="Empresas activas por vencer"
          borderColor="primary"
          alert={renewalsIn30Days > 0}
        />
        <KpiCard
          label="Empresas con error"
          value={companiesWithErrors}
          sub="Requieren atención de sync"
          borderColor="primary"
          alert={companiesWithErrors > 0}
        />
        <KpiCard
          label="Empleados activos"
          value={totalEmpleadosActivos}
          sub="Base laboral activa total"
          borderColor="primary"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-5 xl:grid-cols-2">

        {/* Vencimientos */}
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-4">
            <p className="text-[14px] font-medium text-slate-900">Control de vencimientos</p>
            <p className="text-[12px] text-slate-400">
              Alertas por tramo para anticipar renovaciones comerciales.
            </p>
          </div>
          <div className="p-5 space-y-4">
            {/* Tramo summary */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Vencidos", value: renewalsOverdue, danger: true },
                { label: "0–7 d",    value: renewalsIn7,    warn: true },
                { label: "8–15 d",   value: renewalsIn15,   warn: false },
                { label: "16–30 d",  value: renewalsIn30,   warn: false },
              ].map(({ label, value, danger, warn }) => (
                <div
                  key={label}
                  className="rounded-md border p-3 text-center"
                  style={{
                    borderColor: danger ? "#fecaca" : warn ? "#fde68a" : "#e2e8f0",
                    background:  danger ? "#fef2f2" : warn ? "#fffbeb" : "#f8fafc",
                  }}
                >
                  <p
                    className="text-[20px] font-semibold tabular-nums"
                    style={{ color: danger ? "#dc2626" : warn ? "#d97706" : "#475569" }}
                  >
                    {value}
                  </p>
                  <p className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {renewalAlerts.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                <CheckCircle2 size={22} className="mx-auto mb-2 text-green-400" />
                <p className="text-[13px] text-slate-400">
                  Sin vencimientos en los próximos 30 días.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Empresa
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Paquete
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Vence
                    </TableHead>
                    <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Estado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renewalAlerts.map((item) => {
                    const days = item.remainingDays as number
                    return (
                      <TableRow key={item.empresa.id} className="h-11">
                        <TableCell className="text-[13px] font-medium text-slate-900">
                          {item.empresa.nombre}
                        </TableCell>
                        <TableCell className="text-[12px] text-slate-500">
                          {item.activePackage?.paquete.nombre ?? "—"}
                        </TableCell>
                        <TableCell className="text-[12px] text-slate-500">
                          {formatDate(item.activePackage?.fecha_vencimiento)}
                        </TableCell>
                        <TableCell>
                          <span
                            className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold"
                            style={
                              days < 0
                                ? { borderColor: "#fecaca", background: "#fef2f2", color: "#dc2626" }
                                : days <= 7
                                ? { borderColor: "#fde68a", background: "#fffbeb", color: "#d97706" }
                                : { borderColor: "#e2e8f0", background: "#f8fafc", color: "#64748b" }
                            }
                          >
                            {days < 0 ? `Vencido ${Math.abs(days)}d` : `${days}d`}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Sync status */}
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-4">
            <p className="text-[14px] font-medium text-slate-900">
              Estado de sincronización WP/Tutor
            </p>
            <p className="text-[12px] text-slate-400">
              Semáforo operativo por empresa con reintento directo.
            </p>
          </div>
          <div className="p-5 space-y-4">
            {/* Sync summary */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "OK",      value: syncOk,      ok: true,    warn: false, err: false },
                { label: "Parcial", value: syncPartial,  ok: false,   warn: true,  err: false },
                { label: "Error",   value: syncError,    ok: false,   warn: false, err: true },
              ].map(({ label, value, ok, warn, err }) => (
                <div
                  key={label}
                  className="rounded-md border p-3 text-center"
                  style={{
                    borderColor: err ? "#fecaca" : warn ? "#fde68a" : "#bbf7d0",
                    background:  err ? "#fef2f2" : warn ? "#fffbeb" : "#f0fdf4",
                  }}
                >
                  <p
                    className="text-[20px] font-semibold tabular-nums"
                    style={{ color: err ? "#dc2626" : warn ? "#d97706" : "#16a34a" }}
                  >
                    {value}
                  </p>
                  <p className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Empresa
                  </TableHead>
                  <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Sync
                  </TableHead>
                  <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Errores
                  </TableHead>
                  <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Pendientes
                  </TableHead>
                  <TableHead className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Sin WP ID
                  </TableHead>
                  <TableHead className="text-right text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Acción
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyStats.map((item) => (
                  <TableRow key={item.empresa.id} className="h-11">
                    <TableCell className="text-[13px] font-medium text-slate-900">
                      {item.empresa.nombre}
                    </TableCell>
                    <TableCell>
                      <SyncBadge status={item.syncStatus} />
                    </TableCell>
                    <TableCell>
                      <span className={item.errorCourses > 0 ? "text-[13px] font-semibold text-red-600" : "text-[13px] text-slate-400"}>
                        {item.errorCourses}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={item.pendingCourses > 0 ? "text-[13px] font-semibold text-amber-600" : "text-[13px] text-slate-400"}>
                        {item.pendingCourses}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={item.employeesWithoutWpUser > 0 ? "text-[13px] font-semibold text-slate-700" : "text-[13px] text-slate-400"}>
                        {item.employeesWithoutWpUser}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={retryCompanySyncAction}>
                        <input type="hidden" name="empresa_id" value={item.empresa.id} />
                        <Button variant="outline" size="sm" type="submit" className="h-7 text-[12px]">
                          Reintentar
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
