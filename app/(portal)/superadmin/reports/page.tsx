import { redirect } from "next/navigation"
import { PageHeader } from "@/components/shared/PageHeader"
import { SubmitButton } from "@/components/superadmin/SubmitButton"
import { RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react"
import KpiCard from "@/components/shared/KpiCard"
import { getSuperadminReportsSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"
import { readDecodedSearchParam, readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { retryCompanySyncAction, triggerGlobalLearningSyncAction } from "./actions"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import Paper from "@mui/material/Paper"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import Typography from "@mui/material/Typography"

const DAY_MS       = 1000 * 60 * 60 * 24
const STALE_SYNC_MS = 1000 * 60 * 60 * 24

const successMessages: Record<string, string> = {
  sync_background_started:        "La sincronización global se envió a segundo plano.",
  sync_background_already_running:"Ya existe una sincronización global en proceso.",
  sync_retry_ok:                  "Se ejecutó el reintento de sincronización de la empresa.",
  sync_retry_queue_busy:          "Se actualizó el acceso del paquete. El refresco ya estaba en cola.",
  sync_retry_partial:             "Se lanzó el reintento, pero hubo advertencias. Revisa el detalle.",
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
  const target      = new Date(date)
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  return Math.floor((targetStart - startOfToday) / DAY_MS)
}

type SyncStatus = "OK" | "PARCIAL" | "ERROR" | "SUSPENDIDA"

const SYNC_CHIP_STYLES: Record<SyncStatus, { bg: string; color: string; border: string }> = {
  OK:         { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  PARCIAL:    { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  ERROR:      { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  SUSPENDIDA: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
}

const TH_SX = {
  fontSize: "10.5px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  color: "#94a3b8",
  bgcolor: "transparent",
  borderBottom: "1px solid #f1f5f9",
  py: 1.25,
  px: 2,
}

const TD_SX = {
  py: 1.25,
  px: 2,
  borderBottom: "1px solid #f8fafc",
  fontSize: 13,
}

export default async function SuperAdminReportsPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const params  = await searchParams
  const success = readSearchParam(params, "success")
  const error   = readSearchParam(params, "error")
  const detail  = readDecodedSearchParam(params, "detail")

  const { empresas: companies } = await getSuperadminReportsSnapshot()
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()

  const companyStats = companies.map((company) => {
    const activeEmployees          = company.employees.filter((e) => e.active)
    const suspendedEmployees       = company.employees.length - activeEmployees.length
    const employeesWithoutWpUser   = activeEmployees.filter((e) => !e.wp_user_id).length
    const totalCourses             = activeEmployees.reduce((s, e) => s + e.courses.length, 0)
    const totalProgress            = activeEmployees.reduce((s, e) => s + e.courses.reduce((cs, c) => cs + c.progress_pct, 0), 0)
    const averageProgress          = totalCourses ? Math.round(totalProgress / totalCourses) : 0
    const completedCourses         = activeEmployees.reduce((s, e) => s + e.courses.filter((c) => c.completed).length, 0)
    const notStartedCourses        = activeEmployees.reduce((s, e) => s + e.courses.filter((c) => !c.completed && c.progress_pct === 0).length, 0)
    const errorCourses             = activeEmployees.reduce((s, e) => s + e.courses.filter((c) => c.access_status === "ERROR").length, 0)
    const pendingCourses           = activeEmployees.reduce((s, e) => s + e.courses.filter((c) => c.access_status === "PENDING" || c.access_status === "REQUIRES_REVIEW").length, 0)
    const staleCourses             = activeEmployees.reduce((s, e) => s + e.courses.filter((c) => now - new Date(c.last_synced_at).getTime() > STALE_SYNC_MS).length, 0)
    const employeesWithoutCourses  = activeEmployees.filter((e) => e.courses.length === 0).length

    let syncStatus: SyncStatus = "OK"
    if (!company.active) syncStatus = "SUSPENDIDA"
    else if (errorCourses > 0) syncStatus = "ERROR"
    else if (
      employeesWithoutWpUser > 0 || pendingCourses > 0 || staleCourses > 0 ||
      (activeEmployees.length > 0 && totalCourses === 0)
    ) syncStatus = "PARCIAL"

    const activePackage  = company.packages[0]
    const expirationDate = activePackage?.expiration_date
    const remainingDays  = expirationDate ? calculateRemainingDays(new Date(expirationDate)) : null

    return {
      company,
      activeEmployees: activeEmployees.length,
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

  const activeCompanyStats   = companyStats.filter((i) => i.company.active)
  const totalActiveEmployees = activeCompanyStats.reduce((s, i) => s + i.activeEmployees, 0)
  const totalActiveCourses  = activeCompanyStats.reduce((s, i) => s + i.totalCourses, 0)
  const weightedProgress    = activeCompanyStats.reduce((s, i) => s + i.averageProgress * i.totalCourses, 0)
  const averageProgress     = totalActiveCourses > 0 ? Math.round(weightedProgress / totalActiveCourses) : 0
  const companiesWithErrors = activeCompanyStats.filter((i) => i.syncStatus === "ERROR").length
  const renewalsIn30Days    = activeCompanyStats.filter(
    (i) => i.remainingDays !== null && i.remainingDays >= 0 && i.remainingDays <= 30
  ).length

  const renewalAlerts  = companyStats
    .filter((i) => i.remainingDays !== null && i.remainingDays <= 30)
    .sort((a, b) => (a.remainingDays ?? 0) - (b.remainingDays ?? 0))

  const renewalsOverdue = renewalAlerts.filter((i) => (i.remainingDays ?? 0) < 0).length
  const renewalsIn7    = renewalAlerts.filter((i) => (i.remainingDays ?? 999) >= 0 && (i.remainingDays ?? 999) <= 7).length
  const renewalsIn15   = renewalAlerts.filter((i) => (i.remainingDays ?? 999) >= 8 && (i.remainingDays ?? 999) <= 15).length
  const renewalsIn30   = renewalAlerts.filter((i) => (i.remainingDays ?? 999) >= 16 && (i.remainingDays ?? 999) <= 30).length

  const syncOk      = companyStats.filter((i) => i.syncStatus === "OK").length
  const syncPartial = companyStats.filter((i) => i.syncStatus === "PARCIAL").length
  const syncError   = companyStats.filter((i) => i.syncStatus === "ERROR").length

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
        <Alert severity="success" icon={<CheckCircle2 size={16} />} sx={{ borderRadius: 2, border: "1px solid #bbf7d0", bgcolor: "#f0fdf4", color: "#14532d" }}>
          {detail ? `${successMessages[success] ?? success} — ${detail}` : (successMessages[success] ?? success)}
        </Alert>
      )}
      {error && (
        <Alert severity="error" icon={<AlertCircle size={16} />} sx={{ borderRadius: 2 }}>
          {errorMessages[error] ?? error}
        </Alert>
      )}

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4,1fr)" } }}>
        <KpiCard label="Avance promedio global"  value={`${averageProgress}%`}  sub="Promedio ponderado de cursos"   borderColor="primary" />
        <KpiCard label="Renovaciones en 30 d"    value={renewalsIn30Days}        sub="Empresas activas por vencer"    borderColor="amber" alert={renewalsIn30Days > 0} />
        <KpiCard label="Empresas con error"       value={companiesWithErrors}     sub="Requieren atención de sync"     borderColor="charcoal" alert={companiesWithErrors > 0} />
        <KpiCard label="Empleados activos"        value={totalActiveEmployees}   sub="Base laboral activa total"      borderColor="emerald" />
      </Box>

      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" } }}>

        <Paper elevation={0} sx={{ overflow: "hidden", borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "background.paper" }}>
          <Box sx={{ borderBottom: "1px solid #f1f5f9", px: 3, py: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Control de vencimientos</Typography>
            <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>
              Alertas por tramo para anticipar renovaciones comerciales.
            </Typography>
          </Box>
          <Box sx={{ p: 2.5, display: "grid", gap: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1 }}>
              {[
                { label: "Vencidos", value: renewalsOverdue, danger: true,  warn: false },
                { label: "0–7 d",    value: renewalsIn7,    danger: false,  warn: true  },
                { label: "8–15 d",   value: renewalsIn15,   danger: false,  warn: false },
                { label: "16–30 d",  value: renewalsIn30,   danger: false,  warn: false },
              ].map(({ label, value, danger, warn }) => (
                <Box
                  key={label}
                  sx={{
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: danger ? "#fecaca" : warn ? "#fde68a" : "#e2e8f0",
                    bgcolor: danger ? "#fef2f2" : warn ? "#fffbeb" : "#f8fafc",
                    p: 1.5,
                    textAlign: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 20,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      color: danger ? "#dc2626" : warn ? "#d97706" : "#475569",
                    }}
                  >
                    {value}
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8" }}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {renewalAlerts.length === 0 ? (
              <Box sx={{ borderRadius: 1.5, border: "1px dashed #e2e8f0", bgcolor: "#f8fafc", py: 4, textAlign: "center" }}>
                <CheckCircle2 size={22} style={{ color: "#86efac", margin: "0 auto 8px" }} />
                <Typography sx={{ fontSize: 13, color: "#94a3b8" }}>Sin vencimientos en los próximos 30 días.</Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={TH_SX}>Empresa</TableCell>
                    <TableCell sx={TH_SX}>Paquete</TableCell>
                    <TableCell sx={TH_SX}>Vence</TableCell>
                    <TableCell sx={TH_SX}>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {renewalAlerts.map((item) => {
                    const days = item.remainingDays as number
                    return (
                      <TableRow key={item.company.id} sx={{ height: 44 }}>
                        <TableCell sx={{ ...TD_SX, fontWeight: 500, color: "#0f172a" }}>
                          {item.company.name}
                        </TableCell>
                        <TableCell sx={{ ...TD_SX, color: "#64748b" }}>
                          {item.activePackage?.package.name ?? "—"}
                        </TableCell>
                        <TableCell sx={{ ...TD_SX, color: "#64748b" }}>
                          {formatDate(item.activePackage?.expiration_date)}
                        </TableCell>
                        <TableCell sx={TD_SX}>
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
                                ? { borderColor: "#fecaca", bgcolor: "#fef2f2", color: "#dc2626" }
                                : days <= 7
                                ? { borderColor: "#fde68a", bgcolor: "#fffbeb", color: "#d97706" }
                                : { borderColor: "#e2e8f0", bgcolor: "#f8fafc", color: "#64748b" }),
                            }}
                          >
                            {days < 0 ? `Vencido ${Math.abs(days)}d` : `${days}d`}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ overflow: "hidden", borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "background.paper" }}>
          <Box sx={{ borderBottom: "1px solid #f1f5f9", px: 3, py: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>
              Estado de sincronización WP/Tutor
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>
              Semáforo operativo por empresa con reintento directo.
            </Typography>
          </Box>
          <Box sx={{ p: 2.5, display: "grid", gap: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1 }}>
              {[
                { label: "OK",      value: syncOk,      bg: "#f0fdf4", border: "#bbf7d0", color: "#16a34a" },
                { label: "Parcial", value: syncPartial,  bg: "#fffbeb", border: "#fde68a", color: "#d97706" },
                { label: "Error",   value: syncError,    bg: "#fef2f2", border: "#fecaca", color: "#dc2626" },
              ].map(({ label, value, bg, border, color }) => (
                <Box
                  key={label}
                  sx={{ borderRadius: 1.5, border: "1px solid", borderColor: border, bgcolor: bg, p: 1.5, textAlign: "center" }}
                >
                  <Typography sx={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: "tabular-nums", color }}>
                    {value}
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8" }}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={TH_SX}>Empresa</TableCell>
                  <TableCell sx={TH_SX}>Sync</TableCell>
                  <TableCell sx={TH_SX}>Errores</TableCell>
                  <TableCell sx={TH_SX}>Pend.</TableCell>
                  <TableCell sx={TH_SX}>Sin WP</TableCell>
                  <TableCell sx={{ ...TH_SX, textAlign: "right" }}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {companyStats.map((item) => {
                  const style = SYNC_CHIP_STYLES[item.syncStatus]
                  return (
                    <TableRow key={item.company.id} sx={{ height: 44 }}>
                      <TableCell sx={{ ...TD_SX, fontWeight: 500, color: "#0f172a" }}>
                        {item.company.name}
                      </TableCell>
                      <TableCell sx={TD_SX}>
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
                      </TableCell>
                      <TableCell sx={TD_SX}>
                        <Typography sx={{ fontSize: 13, fontWeight: item.errorCourses > 0 ? 600 : 400, color: item.errorCourses > 0 ? "#dc2626" : "#94a3b8" }}>
                          {item.errorCourses}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TD_SX}>
                        <Typography sx={{ fontSize: 13, fontWeight: item.pendingCourses > 0 ? 600 : 400, color: item.pendingCourses > 0 ? "#d97706" : "#94a3b8" }}>
                          {item.pendingCourses}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TD_SX}>
                        <Typography sx={{ fontSize: 13, fontWeight: item.employeesWithoutWpUser > 0 ? 600 : 400, color: item.employeesWithoutWpUser > 0 ? "#334155" : "#94a3b8" }}>
                          {item.employeesWithoutWpUser}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ ...TD_SX, textAlign: "right" }}>
                        <form action={retryCompanySyncAction}>
                          <input type="hidden" name="empresa_id" value={item.company.id} />
                          <Button
                            variant="outlined"
                            size="small"
                            type="submit"
                            sx={{
                              height: 28,
                              fontSize: 12,
                              borderColor: "divider",
                              color: "text.secondary",
                              "&:hover": { borderColor: "text.secondary" },
                            }}
                          >
                            Reintentar
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
