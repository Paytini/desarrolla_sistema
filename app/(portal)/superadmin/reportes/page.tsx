import { redirect } from "next/navigation"
import { RefreshCw, AlertCircle, CheckCircle2, TrendingUp, Users, Clock, Zap } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

const syncBadge = (status: "OK" | "PARCIAL" | "ERROR" | "SUSPENDIDA") => {
  const map = {
    OK: "bg-green-50 text-green-700 hover:bg-green-50",
    PARCIAL: "bg-amber-50 text-amber-700 hover:bg-amber-50",
    ERROR: "bg-rose-50 text-rose-700 hover:bg-rose-50",
    SUSPENDIDA: "bg-slate-100 text-slate-500 hover:bg-slate-100",
  }
  return map[status]
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
    else if (employeesWithoutWpUser > 0 || pendingCourses > 0 || staleCourses > 0 || (empleadosActivos.length > 0 && totalCourses === 0)) syncStatus = "PARCIAL"

    const activePackage = empresa.paquetes[0]
    const expirationDate = activePackage?.fecha_vencimiento
    const remainingDays = expirationDate ? calculateRemainingDays(new Date(expirationDate)) : null

    return {
      empresa, empleadosActivos: empleadosActivos.length, empleadosSuspendidos,
      employeesWithoutWpUser, totalCourses, averageProgress, completedCourses,
      notStartedCourses, errorCourses, pendingCourses, staleCourses,
      employeesWithoutCourses, syncStatus, activePackage, remainingDays,
    }
  })

  const empresasActivas = companyStats.filter((i) => i.empresa.activo)
  const totalEmpleadosActivos = empresasActivas.reduce((s, i) => s + i.empleadosActivos, 0)
  const totalCursosActivos = empresasActivas.reduce((s, i) => s + i.totalCourses, 0)
  const weightedProgress = empresasActivas.reduce((s, i) => s + i.averageProgress * i.totalCourses, 0)
  const averageProgress = totalCursosActivos > 0 ? Math.round(weightedProgress / totalCursosActivos) : 0
  const companiesWithErrors = empresasActivas.filter((i) => i.syncStatus === "ERROR").length
  const renewalsIn30Days = empresasActivas.filter(
    (i) => i.remainingDays !== null && i.remainingDays >= 0 && i.remainingDays <= 30
  ).length

  const renewalAlerts = companyStats
    .filter((i) => i.remainingDays !== null && i.remainingDays <= 30)
    .sort((a, b) => (a.remainingDays ?? 0) - (b.remainingDays ?? 0))

  const renewalsOverdue = renewalAlerts.filter((i) => (i.remainingDays ?? 0) < 0).length
  const renewalsIn7 = renewalAlerts.filter((i) => (i.remainingDays ?? 999) >= 0 && (i.remainingDays ?? 999) <= 7).length
  const renewalsIn15 = renewalAlerts.filter((i) => (i.remainingDays ?? 999) >= 8 && (i.remainingDays ?? 999) <= 15).length
  const renewalsIn30 = renewalAlerts.filter((i) => (i.remainingDays ?? 999) >= 16 && (i.remainingDays ?? 999) <= 30).length

  const syncOk = companyStats.filter((i) => i.syncStatus === "OK").length
  const syncPartial = companyStats.filter((i) => i.syncStatus === "PARCIAL").length
  const syncError = companyStats.filter((i) => i.syncStatus === "ERROR").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Operaciones</p>
          <h1 className="text-2xl font-bold text-slate-950">Reportes globales</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Vista ejecutiva de vencimientos, sincronización y salud académica por empresa.
          </p>
        </div>
        <form action={triggerGlobalLearningSyncAction}>
          <Button type="submit" className="gap-2 bg-[#E8761A] hover:bg-[#C45F0A]">
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
            {detail ? `${successMessages[success] ?? success} — ${detail}` : (successMessages[success] ?? success)}
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{errorMessages[error] ?? error}</AlertDescription>
        </Alert>
      )}

      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Avance promedio global", value: `${averageProgress}%`, sub: "Promedio ponderado de cursos", icon: TrendingUp, cls: "bg-[#fff5ed] text-[#E8761A]" },
          { label: "Renovaciones en 30 días", value: String(renewalsIn30Days), sub: "Empresas activas por vencer", icon: Clock, cls: "bg-amber-50 text-amber-600" },
          { label: "Empresas con error", value: String(companiesWithErrors), sub: "Requieren atención de sync", icon: Zap, cls: companiesWithErrors > 0 ? "bg-rose-50 text-rose-500" : "bg-slate-100 text-slate-500" },
          { label: "Empleados activos", value: String(totalEmpleadosActivos), sub: "Base laboral activa total", icon: Users, cls: "bg-slate-100 text-slate-600" },
        ].map(({ label, value, sub, icon: Icon, cls }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{sub}</p>
                </div>
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${cls}`}>
                  <Icon size={16} strokeWidth={2} />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Renewal control */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Control de vencimientos</CardTitle>
            <CardDescription>Alertas por tramo para anticipar renovaciones comerciales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tramo summary */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Vencidos", value: renewalsOverdue, cls: "bg-rose-50 text-rose-700 border-rose-200" },
                { label: "0–7 días", value: renewalsIn7, cls: "bg-amber-50 text-amber-700 border-amber-200" },
                { label: "8–15 días", value: renewalsIn15, cls: "bg-[#fff5ed] text-[#C45F0A] border-orange-200" },
                { label: "16–30 días", value: renewalsIn30, cls: "bg-slate-50 text-slate-600 border-slate-200" },
              ].map(({ label, value, cls }) => (
                <div key={label} className={`rounded-lg border p-3 text-center ${cls}`}>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>

            {renewalAlerts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                <CheckCircle2 size={24} className="mx-auto mb-2 text-green-400" />
                <p className="text-sm text-slate-400">Sin vencimientos en los próximos 30 días.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Paquete</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renewalAlerts.map((item) => {
                    const days = item.remainingDays as number
                    const badgeCls = days < 0
                      ? "bg-rose-100 text-rose-700 hover:bg-rose-100"
                      : days <= 7
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                      : "bg-[#fff5ed] text-[#C45F0A] hover:bg-[#fff5ed]"
                    return (
                      <TableRow key={item.empresa.id}>
                        <TableCell className="font-medium">{item.empresa.nombre}</TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {item.activePackage?.paquete.nombre ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {formatDate(item.activePackage?.fecha_vencimiento)}
                        </TableCell>
                        <TableCell>
                          <Badge className={badgeCls}>
                            {days < 0 ? `Vencido ${Math.abs(days)}d` : `${days}d`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Sync status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Estado de sincronización WP/Tutor</CardTitle>
            <CardDescription>Semáforo operativo por empresa con reintento directo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sync summary */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "OK", value: syncOk, cls: "bg-green-50 text-green-700 border-green-200" },
                { label: "Parcial", value: syncPartial, cls: "bg-amber-50 text-amber-700 border-amber-200" },
                { label: "Error", value: syncError, cls: "bg-rose-50 text-rose-700 border-rose-200" },
              ].map(({ label, value, cls }) => (
                <div key={label} className={`rounded-lg border p-3 text-center ${cls}`}>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Sync</TableHead>
                  <TableHead>Errores</TableHead>
                  <TableHead>Pendientes</TableHead>
                  <TableHead>Sin WP ID</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyStats.map((item) => (
                  <TableRow key={item.empresa.id}>
                    <TableCell className="font-medium">{item.empresa.nombre}</TableCell>
                    <TableCell>
                      <Badge className={syncBadge(item.syncStatus)}>{item.syncStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={item.errorCourses > 0 ? "font-semibold text-rose-600" : "text-slate-400"}>
                        {item.errorCourses}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={item.pendingCourses > 0 ? "font-semibold text-amber-600" : "text-slate-400"}>
                        {item.pendingCourses}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={item.employeesWithoutWpUser > 0 ? "font-semibold text-slate-700" : "text-slate-400"}>
                        {item.employeesWithoutWpUser}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={retryCompanySyncAction}>
                        <input type="hidden" name="empresa_id" value={item.empresa.id} />
                        <Button variant="outline" size="sm" type="submit">
                          Reintentar
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
