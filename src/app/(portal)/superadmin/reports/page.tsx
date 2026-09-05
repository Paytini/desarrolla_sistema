import { redirect } from "next/navigation"
import { amber, green, red, slate } from "@/lib/theme-tokens"
import { PageHeader } from "@/components/shared/PageHeader"
import { SubmitButton } from "@/components/shared/SubmitButton"
import { RefreshCw, CheckCircle2 } from "lucide-react"
import KpiCard from "@/components/shared/KpiCard"
import { getSuperadminReportsSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"
import { readDecodedSearchParam, readSearchParam } from "@/lib/search-params"
import { paginate } from "@/lib/pagination"
import { getSession } from "@/lib/session"
import { retryCompanySyncAction, triggerGlobalLearningSyncAction } from "./actions"
import { DismissibleAlert } from "@/components/shared/DismissibleAlert"
import { Pagination } from "@/components/shared/Pagination"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"

const DAY_MS = 1000 * 60 * 60 * 24

const successMessages: Record<string, string> = {
  sync_background_started: "La sincronización global se envió a segundo plano.",
  sync_background_already_running: "Ya existe una sincronización global en proceso.",
  sync_retry_ok:
    "Se encoló el reintento de sincronización de la empresa. Verás el progreso en unos minutos.",
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

type SyncStatus = "OK" | "PARCIAL" | "ERROR" | "SUSPENDIDA"

const SYNC_CHIP_STYLES: Record<SyncStatus, { bg: string; color: string; border: string }> = {
  OK: { bg: green[50], color: green[700], border: green[200] },
  PARCIAL: { bg: amber[50], color: amber[700], border: amber[200] },
  ERROR: { bg: red[50], color: red[600], border: red[200] },
  SUSPENDIDA: { bg: slate[50], color: slate[500], border: slate[200] },
}

export default async function SuperAdminReportsPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== "SUPERADMIN") redirect("/login")

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")
  const detail = readDecodedSearchParam(params, "detail")
  const syncQ = readSearchParam(params, "sync_q")?.toLowerCase() ?? ""
  const syncPage = Math.max(1, Number(readSearchParam(params, "sync_page") ?? "1"))

  const { empresas: companies } = await getSuperadminReportsSnapshot()

  const companyStats = companies.map((company) => {
    const {
      activeEmployees,
      suspendedEmployees,
      employeesWithoutWpUser,
      totalCourses,
      averageProgress,
      completedCourses,
      notStartedCourses,
      errorCourses,
      pendingCourses,
      staleCourses,
      employeesWithoutCourses,
    } = company

    let syncStatus: SyncStatus = "OK"
    if (!company.active) syncStatus = "SUSPENDIDA"
    else if (errorCourses > 0) syncStatus = "ERROR"
    else if (
      employeesWithoutWpUser > 0 ||
      pendingCourses > 0 ||
      staleCourses > 0 ||
      (activeEmployees > 0 && totalCourses === 0)
    )
      syncStatus = "PARCIAL"

    const activePackage = company.packages[0]
    const expirationDate = activePackage?.expiration_date
    const remainingDays = expirationDate ? calculateRemainingDays(new Date(expirationDate)) : null

    return {
      company,
      activeEmployees,
      suspendedEmployees,
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

  const activeCompanyStats = companyStats.filter((i) => i.company.active)
  const totalActiveEmployees = activeCompanyStats.reduce((s, i) => s + i.activeEmployees, 0)
  const totalActiveCourses = activeCompanyStats.reduce((s, i) => s + i.totalCourses, 0)
  const weightedProgress = activeCompanyStats.reduce(
    (s, i) => s + i.averageProgress * i.totalCourses,
    0,
  )
  const averageProgress =
    totalActiveCourses > 0 ? Math.round(weightedProgress / totalActiveCourses) : 0
  const companiesWithErrors = activeCompanyStats.filter((i) => i.syncStatus === "ERROR").length
  const renewalsIn30Days = activeCompanyStats.filter(
    (i) => i.remainingDays !== null && i.remainingDays >= 0 && i.remainingDays <= 30,
  ).length

  const renewalAlerts = companyStats
    .filter((i) => i.remainingDays !== null && i.remainingDays <= 30)
    .sort((a, b) => (a.remainingDays ?? 0) - (b.remainingDays ?? 0))

  const renewalsOverdue = renewalAlerts.filter((i) => (i.remainingDays ?? 0) < 0).length
  const renewalsIn7 = renewalAlerts.filter(
    (i) => (i.remainingDays ?? 999) >= 0 && (i.remainingDays ?? 999) <= 7,
  ).length
  const renewalsIn15 = renewalAlerts.filter(
    (i) => (i.remainingDays ?? 999) >= 8 && (i.remainingDays ?? 999) <= 15,
  ).length
  const renewalsIn30 = renewalAlerts.filter(
    (i) => (i.remainingDays ?? 999) >= 16 && (i.remainingDays ?? 999) <= 30,
  ).length

  const syncOk = companyStats.filter((i) => i.syncStatus === "OK").length
  const syncPartial = companyStats.filter((i) => i.syncStatus === "PARCIAL").length
  const syncError = companyStats.filter((i) => i.syncStatus === "ERROR").length

  const SYNC_PAGE_SIZE = 20
  const filteredCompanyStats = syncQ
    ? companyStats.filter((i) => i.company.name.toLowerCase().includes(syncQ))
    : companyStats
  const {
    items: pagedCompanyStats,
    currentPage: syncCurrentPage,
    totalPages: syncTotalPages,
  } = paginate(filteredCompanyStats, syncPage, SYNC_PAGE_SIZE)

  function syncPageUrl(p: number) {
    const qs = new URLSearchParams()
    if (syncQ) qs.set("sync_q", syncQ)
    if (p > 1) qs.set("sync_page", String(p))
    const str = qs.toString()
    return `/superadmin/reports${str ? `?${str}` : ""}`
  }

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <PageHeader
        title="Reportes globales"
        description="Vista ejecutiva de vencimientos, sincronización y salud académica por empresa."
        action={
          <form action={triggerGlobalLearningSyncAction}>
            <SubmitButton>
              <RefreshCw size={14} strokeWidth={2} />
              Sincronizar todo
            </SubmitButton>
          </form>
        }
      />

      {success && (
        <DismissibleAlert severity="success">
          {detail
            ? `${successMessages[success] ?? success} — ${detail}`
            : (successMessages[success] ?? success)}
        </DismissibleAlert>
      )}
      {error && (
        <DismissibleAlert severity="error">{errorMessages[error] ?? error}</DismissibleAlert>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4,1fr)" },
        }}
      >
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
          borderColor="amber"
          alert={renewalsIn30Days > 0}
        />
        <KpiCard
          label="Empresas con error"
          value={companiesWithErrors}
          sub="Requieren atención de sync"
          borderColor="charcoal"
          alert={companiesWithErrors > 0}
        />
        <KpiCard
          label="Empleados activos"
          value={totalActiveEmployees}
          sub="Base laboral activa total"
          borderColor="emerald"
        />
      </Box>

      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" } }}>
        <Paper
          elevation={0}
          sx={{
            overflow: "hidden",
            borderRadius: 2,
            border: `1px solid ${slate[200]}`,
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ borderBottom: `1px solid ${slate[100]}`, px: 3, py: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 500, color: slate[900] }}>
              Control de vencimientos
            </Typography>
            <Typography sx={{ fontSize: 12, color: slate[400] }}>
              Alertas por tramo para anticipar renovaciones comerciales.
            </Typography>
          </Box>
          <Box sx={{ p: 2.5, display: "grid", gap: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1 }}>
              {[
                { label: "Vencidos", value: renewalsOverdue, danger: true, warn: false },
                { label: "0–7 d", value: renewalsIn7, danger: false, warn: true },
                { label: "8–15 d", value: renewalsIn15, danger: false, warn: false },
                { label: "16–30 d", value: renewalsIn30, danger: false, warn: false },
              ].map(({ label, value, danger, warn }) => (
                <Box
                  key={label}
                  sx={{
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: danger ? red[200] : warn ? amber[200] : slate[200],
                    bgcolor: danger ? red[50] : warn ? amber[50] : slate[50],
                    p: 1.5,
                    textAlign: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 20,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      color: danger ? red[600] : warn ? amber[600] : slate[600],
                    }}
                  >
                    {value}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: "9.5px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: slate[400],
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {renewalAlerts.length === 0 ? (
              <Box
                sx={{
                  borderRadius: 1.5,
                  border: `1px dashed ${slate[200]}`,
                  bgcolor: slate[50],
                  py: 4,
                  textAlign: "center",
                }}
              >
                <CheckCircle2 size={22} style={{ color: green[300], margin: "0 auto 8px" }} />
                <Typography sx={{ fontSize: 13, color: slate[400] }}>
                  Sin vencimientos en los próximos 30 días.
                </Typography>
              </Box>
            ) : (
              <DataTable
                ariaLabel="Control de vencimientos"
                columns={[
                  { label: "Empresa" },
                  { label: "Paquete" },
                  { label: "Vence" },
                  { label: "Estado" },
                ]}
                rows={renewalAlerts.map((item) => {
                  const days = item.remainingDays as number
                  return (
                    <tr
                      key={item.company.id}
                      className="bg-white transition-colors hover:bg-gray-50"
                    >
                      <td className="rounded-l-lg px-4 py-3 text-sm font-medium text-slate-900">
                        {item.company.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {item.activePackage?.package.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDate(item.activePackage?.expiration_date)}
                      </td>
                      <td className="rounded-r-lg px-4 py-3">
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            borderRadius: 0.75,
                            border: "1px solid",
                            px: 0.75,
                            py: 0.25,
                            fontSize: "10px",
                            fontWeight: 600,
                            ...(days < 0
                              ? { borderColor: red[200], bgcolor: red[50], color: red[600] }
                              : days <= 7
                                ? { borderColor: amber[200], bgcolor: amber[50], color: amber[600] }
                                : {
                                    borderColor: slate[200],
                                    bgcolor: slate[50],
                                    color: slate[500],
                                  }),
                          }}
                        >
                          {days < 0 ? `Vencido ${Math.abs(days)}d` : `${days}d`}
                        </Box>
                      </td>
                    </tr>
                  )
                })}
              />
            )}
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            overflow: "hidden",
            borderRadius: 2,
            border: `1px solid ${slate[200]}`,
            bgcolor: "background.paper",
          }}
        >
          <Box
            sx={{
              borderBottom: `1px solid ${slate[100]}`,
              px: 3,
              py: 2,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 500, color: slate[900] }}>
                Estado de sincronización WP/Tutor
              </Typography>
              <Typography sx={{ fontSize: 12, color: slate[400] }}>
                Semáforo operativo por empresa con reintento directo.
              </Typography>
            </Box>
            <Box
              component="form"
              method="GET"
              sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
            >
              <SearchInput
                name="sync_q"
                defaultValue={syncQ}
                placeholder="Buscar empresa…"
                width={180}
              />
            </Box>
          </Box>
          <Box sx={{ p: 2.5, display: "grid", gap: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1 }}>
              {[
                {
                  label: "OK",
                  value: syncOk,
                  bg: green[50],
                  border: green[200],
                  color: green[600],
                },
                {
                  label: "Parcial",
                  value: syncPartial,
                  bg: amber[50],
                  border: amber[200],
                  color: amber[600],
                },
                {
                  label: "Error",
                  value: syncError,
                  bg: red[50],
                  border: red[200],
                  color: red[600],
                },
              ].map(({ label, value, bg, border, color }) => (
                <Box
                  key={label}
                  sx={{
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: border,
                    bgcolor: bg,
                    p: 1.5,
                    textAlign: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 20,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      color,
                    }}
                  >
                    {value}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: "9.5px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: slate[400],
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {filteredCompanyStats.length === 0 ? (
              <Box
                sx={{
                  borderRadius: 1.5,
                  border: `1px dashed ${slate[200]}`,
                  bgcolor: slate[50],
                  py: 4,
                  textAlign: "center",
                }}
              >
                <Typography sx={{ fontSize: 13, color: slate[400] }}>
                  Sin resultados para ese filtro.
                </Typography>
              </Box>
            ) : (
              <DataTable
                ariaLabel="Estado de sincronización WP/Tutor"
                columns={[
                  { label: "Empresa" },
                  { label: "Sync" },
                  { label: "Errores" },
                  { label: "Pend." },
                  { label: "Sin WP" },
                  { label: "Acción", className: "text-right" },
                ]}
                rows={pagedCompanyStats.map((item) => {
                  const style = SYNC_CHIP_STYLES[item.syncStatus]
                  return (
                    <tr
                      key={item.company.id}
                      className="bg-white transition-colors hover:bg-gray-50"
                    >
                      <td className="rounded-l-lg px-4 py-3 text-sm font-medium text-slate-900">
                        {item.company.name}
                      </td>
                      <td className="px-4 py-3">
                        <Chip
                          label={item.syncStatus}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "10px",
                            fontWeight: 600,
                            border: "1px solid",
                            borderColor: style.border,
                            bgcolor: style.bg,
                            color: style.color,
                            "& .MuiChip-label": { px: 1 },
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: item.errorCourses > 0 ? 600 : 400,
                            color: item.errorCourses > 0 ? red[600] : slate[400],
                          }}
                        >
                          {item.errorCourses}
                        </Typography>
                      </td>
                      <td className="px-4 py-3">
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: item.pendingCourses > 0 ? 600 : 400,
                            color: item.pendingCourses > 0 ? amber[600] : slate[400],
                          }}
                        >
                          {item.pendingCourses}
                        </Typography>
                      </td>
                      <td className="px-4 py-3">
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: item.employeesWithoutWpUser > 0 ? 600 : 400,
                            color: item.employeesWithoutWpUser > 0 ? slate[700] : slate[400],
                          }}
                        >
                          {item.employeesWithoutWpUser}
                        </Typography>
                      </td>
                      <td className="rounded-r-lg px-4 py-3 text-right">
                        <form action={retryCompanySyncAction}>
                          <input type="hidden" name="empresa_id" value={item.company.id} />
                          <SubmitButton
                            variant="outlined"
                            size="small"
                            sx={{
                              height: 28,
                              fontSize: 12,
                              borderColor: "divider",
                              color: "text.secondary",
                              "&:hover": { borderColor: "text.secondary" },
                            }}
                          >
                            Reintentar
                          </SubmitButton>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              />
            )}
            <Pagination
              currentPage={syncCurrentPage}
              totalPages={syncTotalPages}
              totalResults={filteredCompanyStats.length}
              buildPageUrl={syncPageUrl}
            />
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
