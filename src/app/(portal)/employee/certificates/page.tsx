import { amber, fd, portalColors, sky, slate } from "@/lib/theme-tokens"
import EmptyState from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"
import EmployeeLearningRefresh from "@/components/employee/EmployeeLearningRefresh"
import { getEmployeeLearningData } from "@/lib/employee-learning"
import { formatDateTime } from "@/lib/format"
import type { PortalCertificateRecord, PortalCourseRecord } from "@/lib/learning-types"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"

export default async function EmployeeCertificatesPage() {
  const session = await getSession()
  if (!session || session.user.role !== "EMPLOYEE" || !session.user.empresa_id) {
    redirect("/login")
  }

  const learningData = await getEmployeeLearningData(session.user.email ?? "")
  const employee = learningData?.employee
  if (!employee) redirect("/login")

  const certificates = (employee.certificates ?? []) as PortalCertificateRecord[]
  const pendingCertificates = (learningData?.pendingCertificates ?? []) as PortalCourseRecord[]

  const nonDc3Courses = await prisma.courseDc3Metadata.findMany({
    where: { grants_dc3: false },
    select: { wp_course_id: true },
  })
  const excludedCourseIds = new Set(nonDc3Courses.map((c) => c.wp_course_id))

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <PageHeader
        title="Mis constancias"
        description="Evidencia DC-3 oficial STPS de tus cursos completados"
      />

      <EmployeeLearningRefresh autoRefresh pollIntervalMs={60_000} />

      {learningData?.syncError ? (
        <Alert
          severity="warning"
          sx={{
            borderRadius: 2,
            border: `1px solid ${amber[200]}`,
            bgcolor: amber[50],
            color: amber[900],
          }}
        >
          No pudimos refrescar tus constancias. Mostramos el último dato guardado.
        </Alert>
      ) : null}

      {!learningData?.syncError && learningData?.backgroundSyncQueued ? (
        <Alert
          severity="info"
          sx={{
            borderRadius: 2,
            border: `1px solid ${sky[200]}`,
            bgcolor: sky[50],
            color: sky[900],
          }}
        >
          Verificando tus constancias más recientes. La vista se actualizará automáticamente.
        </Alert>
      ) : null}

      <Box sx={{ display: "grid", gap: 2.5 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2.5,
            border: `1px solid ${portalColors.cardBorder}`,
            bgcolor: "background.paper",
            p: 2.5,
          }}
        >
          <Box
            sx={{
              mb: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: portalColors.ink }}>
                Constancias disponibles
              </Typography>
              <Typography sx={{ fontSize: 13, color: slate[400] }}>
                {certificates.length}
              </Typography>
            </Box>
            {certificates.length > 0 ? (
              <Button
                component="a"
                href="/api/certificates/zip"
                download
                variant="outlined"
                size="small"
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${portalColors.cardBorder}`,
                  fontSize: 11,
                  fontWeight: 600,
                  color: portalColors.ink,
                  "&:hover": { bgcolor: slate[50], borderColor: slate[200] },
                }}
              >
                Descargar ZIP
              </Button>
            ) : null}
          </Box>

          {certificates.length === 0 ? (
            <EmptyState message="Aún no hay constancias emitidas para tu perfil." />
          ) : (
            <Box sx={{ display: "grid", gap: 1 }}>
              {certificates.map((certificate) => (
                <Box
                  key={certificate.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${portalColors.cardBorder}`,
                    bgcolor: "background.paper",
                    px: 2,
                    py: 1.5,
                    transition: "background-color 0.12s ease",
                    "&:hover": { bgcolor: slate[50] },
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
                      bgcolor: "var(--portal-blue-soft)",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--portal-blue)",
                    }}
                  >
                    {certificate.course_name.charAt(0).toUpperCase()}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: portalColors.ink,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {certificate.course_name}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: slate[500] }}>
                      Folio:{" "}
                      <Box component="span" sx={{ fontFamily: "monospace" }}>
                        {certificate.reference_number}
                      </Box>
                      {" · "}
                      {formatDateTime(certificate.issued_at)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexShrink: 0, gap: 0.75 }}>
                    {certificate.certificate_url ? (
                      <Button
                        component="a"
                        href={certificate.certificate_url}
                        target="_blank"
                        rel="noreferrer"
                        variant="outlined"
                        size="small"
                        sx={{
                          borderRadius: 2,
                          border: `1px solid ${portalColors.cardBorder}`,
                          fontSize: 11,
                          fontWeight: 600,
                          color: portalColors.ink,
                          "&:hover": { bgcolor: slate[50], borderColor: slate[200] },
                        }}
                      >
                        Ver Diploma
                      </Button>
                    ) : null}
                    {!excludedCourseIds.has(certificate.wp_course_id) ? (
                      <Button
                        component="a"
                        href={`/api/certificates/${certificate.id}/dc3`}
                        target="_blank"
                        rel="noreferrer"
                        variant="contained"
                        size="small"
                        disableElevation
                        sx={{
                          borderRadius: 2,
                          fontSize: 11,
                          fontWeight: 600,
                          bgcolor: "var(--portal-blue)",
                          color: fd.background,
                          "&:hover": { bgcolor: "var(--portal-blue-hover)" },
                        }}
                      >
                        Descargar DC-3
                      </Button>
                    ) : null}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        {pendingCertificates.length > 0 ? (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2.5,
              border: `1px solid ${portalColors.cardBorder}`,
              bgcolor: "background.paper",
              p: 2.5,
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 600, color: portalColors.ink }}>
                  Pendientes por aparecer
                </Typography>
                <Typography sx={{ fontSize: 13, color: slate[400] }}>
                  {pendingCertificates.length}
                </Typography>
              </Box>
              <Typography sx={{ mt: 0.5, fontSize: 11, color: slate[400] }}>
                Cursos que ya completaste, pero cuya constancia aún no ha sido generada o
                sincronizada. No necesitas hacer nada: aparecerá aquí como disponible en cuanto se
                procese.
              </Typography>
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
                    border: `1px solid ${amber[200]}`,
                    bgcolor: "rgba(254,251,235,0.5)",
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: amber[950],
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {course.course_name}
                    </Typography>
                    {course.completed_at ? (
                      <Typography sx={{ fontSize: 11, color: amber[700] }}>
                        Completado: {formatDateTime(course.completed_at)}
                      </Typography>
                    ) : null}
                  </Box>
                  <Box
                    sx={{
                      flexShrink: 0,
                      borderRadius: "999px",
                      bgcolor: amber[200],
                      px: 1,
                      py: 0.25,
                      fontSize: "10px",
                      fontWeight: 600,
                      color: amber[900],
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
