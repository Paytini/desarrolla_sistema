import KpiCard from "@/components/shared/KpiCard"
import { PageHeader } from "@/components/shared/PageHeader"
import EmployeeLearningRefresh from "@/components/empleado/EmployeeLearningRefresh"
import { getEmployeeLearningData } from "@/lib/employee-learning"
import { formatDateTime } from "@/lib/format"
import type { PortalCertificateRecord, PortalCourseRecord } from "@/lib/learning-types"
import { getSession } from "@/lib/session"
import { Award, Clock } from "lucide-react"
import { redirect } from "next/navigation"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"

export default async function EmpleadoConstanciasPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "EMPLEADO" || !session.user.empresa_id) {
    redirect("/login")
  }

  const learningData = await getEmployeeLearningData(session.user.email ?? "")
  const empleado     = learningData?.empleado
  if (!empleado) redirect("/login")

  const constancias         = (empleado.constancias ?? []) as PortalCertificateRecord[]
  const pendingCertificates = (learningData?.pendingCertificates ?? []) as PortalCourseRecord[]

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <PageHeader
        title="Mis constancias"
        description="Evidencia DC-3 oficial STPS de tus cursos completados"
        accentColor="#34D399"
        breadcrumbs={[{ label: "Mi espacio" }, { label: "Constancias" }]}
      />

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        <KpiCard label="Emitidas"   value={String(constancias.length)}         sub="Listas para descarga"      icon={Award}  borderColor="orange" />
        <KpiCard label="Pendientes" value={String(pendingCertificates.length)} sub="Cursos sin constancia aún" icon={Clock}  borderColor="amber" />
      </Box>

      <EmployeeLearningRefresh autoRefresh pollIntervalMs={15_000} />

      {learningData?.syncError ? (
        <Alert severity="warning" sx={{ borderRadius: 2, border: "1px solid #fde68a", bgcolor: "#fffbeb", color: "#78350f" }}>
          No pudimos refrescar tus constancias. Mostramos el último dato guardado.
        </Alert>
      ) : null}

      {!learningData?.syncError && learningData?.backgroundSyncQueued ? (
        <Alert severity="info" sx={{ borderRadius: 2, border: "1px solid #bae6fd", bgcolor: "#f0f9ff", color: "#0c4a6e" }}>
          Verificando constancias con Tutor LMS. La vista se actualizará automáticamente.
        </Alert>
      ) : null}

      <Box sx={{ display: "grid", gap: 2.5 }}>
        <Paper elevation={0} sx={{ borderRadius: 2.5, border: "1px solid #f0f0f0", bgcolor: "background.paper", p: 2.5 }}>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>
                Constancias disponibles
              </Typography>
              <Typography sx={{ fontSize: 13, color: "#94a3b8" }}>{constancias.length}</Typography>
            </Box>
            {constancias.length > 0 ? (
              <Button
                component="a"
                href="/api/constancias/zip"
                download
                variant="outlined"
                size="small"
                sx={{
                  borderRadius: 2,
                  border: "1px solid #f0f0f0",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#1a1a1a",
                  "&:hover": { bgcolor: "#f8fafc", borderColor: "#e2e8f0" },
                }}
              >
                Descargar ZIP
              </Button>
            ) : null}
          </Box>

          {constancias.length === 0 ? (
            <Box
              sx={{
                borderRadius: 2,
                border: "1px dashed #f0f0f0",
                bgcolor: "#f8fafc",
                px: 2,
                py: 4,
                textAlign: "center",
              }}
            >
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                Aún no hay constancias emitidas para tu perfil.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "grid", gap: 1 }}>
              {constancias.map((constancia) => (
                <Box
                  key={constancia.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    borderRadius: 2,
                    border: "1px solid #f0f0f0",
                    bgcolor: "background.paper",
                    px: 2,
                    py: 1.5,
                    transition: "background-color 0.12s ease",
                    "&:hover": { bgcolor: "#f8fafc" },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 36,
                      height: 36,
                      flexShrink: 0,
                      borderRadius: 2,
                      bgcolor: "#fff2eb",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#F5853F",
                    }}
                  >
                    {constancia.nombre_curso.charAt(0).toUpperCase()}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1a1a1a",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {constancia.nombre_curso}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "#64748b" }}>
                      Folio:{" "}
                      <Box component="span" sx={{ fontFamily: "monospace" }}>
                        {constancia.folio}
                      </Box>
                      {" · "}
                      {formatDateTime(constancia.fecha_emision)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexShrink: 0, gap: 0.75 }}>
                    {constancia.wp_cert_url ? (
                      <Button
                        component="a"
                        href={constancia.wp_cert_url}
                        target="_blank"
                        rel="noreferrer"
                        variant="outlined"
                        size="small"
                        sx={{
                          borderRadius: 2,
                          border: "1px solid #f0f0f0",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#1a1a1a",
                          "&:hover": { bgcolor: "#f8fafc", borderColor: "#e2e8f0" },
                        }}
                      >
                        Ver Diploma
                      </Button>
                    ) : null}
                    <Button
                      component="a"
                      href={`/api/constancias/${constancia.id}/dc3`}
                      target="_blank"
                      rel="noreferrer"
                      variant="contained"
                      size="small"
                      disableElevation
                      sx={{
                        borderRadius: 2,
                        fontSize: 11,
                        fontWeight: 600,
                        bgcolor: "#F5853F",
                        color: "#fff",
                        "&:hover": { bgcolor: "#D96B20" },
                      }}
                    >
                      Descargar DC-3
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        {pendingCertificates.length > 0 ? (
          <Paper elevation={0} sx={{ borderRadius: 2.5, border: "1px solid #f0f0f0", bgcolor: "background.paper", p: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 2 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>
                Pendientes por aparecer
              </Typography>
              <Typography sx={{ fontSize: 13, color: "#94a3b8" }}>{pendingCertificates.length}</Typography>
            </Box>
            <Box sx={{ display: "grid", gap: 1 }}>
              {pendingCertificates.map((course) => (
                <Box
                  key={course.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    borderRadius: 2,
                    border: "1px solid #fde68a",
                    bgcolor: "rgba(254,251,235,0.5)",
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 36,
                      height: 36,
                      flexShrink: 0,
                      borderRadius: 2,
                      bgcolor: "#fef3c7",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#b45309",
                    }}
                  >
                    {course.nombre_curso.charAt(0).toUpperCase()}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#451a03",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {course.nombre_curso}
                    </Typography>
                    {course.fecha_completado ? (
                      <Typography sx={{ fontSize: 11, color: "#b45309" }}>
                        Completado: {formatDateTime(course.fecha_completado)}
                      </Typography>
                    ) : null}
                  </Box>
                  <Box
                    sx={{
                      flexShrink: 0,
                      borderRadius: "999px",
                      bgcolor: "#fde68a",
                      px: 1,
                      py: 0.25,
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#78350f",
                    }}
                  >
                    Pendiente
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        ) : null}
      </Box>
    </Box>
  )
}
