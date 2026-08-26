import EmptyState from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"
import StatusBadge from "@/components/shared/StatusBadge"
import EmployeeLearningRefresh from "@/components/employee/EmployeeLearningRefresh"
import { getEmployeeLearningData } from "@/lib/employee-learning"
import { formatDateTime } from "@/lib/format"
import type { PortalCourseRecord } from "@/lib/learning-types"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import {
  buildWordPressCourseLaunchUrl,
  getWordPressSiteUrl,
  isWordPressBridgeConfigured,
} from "@/lib/wordpress-bridge"
import { getWordPressCourseCatalog } from "@/lib/wordpress-course-catalog"
import { Award, ClipboardList } from "lucide-react"
import { redirect } from "next/navigation"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"

function getCourseUrl(
  courseId: number,
  courseUrlById: Map<number, string>,
  fallbackUrlById: Map<number, string>,
) {
  const direct = courseUrlById.get(courseId)
  if (direct) return direct
  const fallback = fallbackUrlById.get(courseId)
  if (fallback) return fallback
  const siteUrl = getWordPressSiteUrl()
  return siteUrl ? `${siteUrl}/?p=${courseId}` : null
}

export default async function EmployeeCourses() {
  const session = await getSession()
  if (!session || session.user.role !== "EMPLOYEE" || !session.user.empresa_id) {
    redirect("/login")
  }

  const learningData = await getEmployeeLearningData(session.user.email ?? "")
  const employee = learningData?.employee
  if (!employee) redirect("/login")

  let courseUrlById = new Map<number, string>()
  let fallbackUrlById = new Map<number, string>()
  let thumbnailById = new Map<number, string>()

  if (isWordPressBridgeConfigured()) {
    try {
      const bridgeCourses = await getWordPressCourseCatalog()
      courseUrlById = new Map(
        bridgeCourses.courses
          .filter((c) => c.course_url)
          .map((c) => [c.wp_course_id, c.course_url as string]),
      )
      const siteUrl = getWordPressSiteUrl()
      fallbackUrlById = new Map(
        bridgeCourses.courses
          .filter((c) => c.post_type && siteUrl)
          .map((c) => [c.wp_course_id, `${siteUrl}/?post_type=${c.post_type}&p=${c.wp_course_id}`]),
      )
      thumbnailById = new Map(
        bridgeCourses.courses
          .filter((c) => c.thumbnail_url)
          .map((c) => [c.wp_course_id, c.thumbnail_url as string]),
      )
    } catch {}
  }

  if (session.user.empresa_id) {
    try {
      const pkg = await prisma.company.findUnique({
        where: { id: session.user.empresa_id },
        select: {
          packages: {
            where: { active: true },
            select: {
              package: {
                select: { courses: { select: { wp_course_id: true, cover_url: true } } },
              },
            },
            take: 1,
          },
        },
      })
      for (const c of pkg?.packages[0]?.package?.courses ?? []) {
        if (c.cover_url) thumbnailById.set(c.wp_course_id, c.cover_url)
      }
    } catch {}
  }

  const courses = employee.courses as PortalCourseRecord[]

  let dc3MetaMap = new Map<number, { duration_hours: number | null }>()
  let pkgCourseMap = new Map<number, { description: string | null; lesson_count: number | null }>()

  if (session.user.empresa_id && courses.length > 0) {
    try {
      const wpIds = courses.map((c) => c.wp_course_id)
      const [dc3MetaRecords, pkgCourses] = await Promise.all([
        prisma.courseDc3Metadata.findMany({
          where: { wp_course_id: { in: wpIds } },
          select: { wp_course_id: true, duration_hours: true },
        }),
        prisma.packageCourse.findMany({
          where: { wp_course_id: { in: wpIds } },
          select: { wp_course_id: true, description: true, lesson_count: true },
          distinct: ["wp_course_id"],
        }),
      ])
      dc3MetaMap = new Map(
        dc3MetaRecords.map((m) => [m.wp_course_id, { duration_hours: m.duration_hours }]),
      )
      pkgCourseMap = new Map(
        pkgCourses.map((c) => [
          c.wp_course_id,
          { description: c.description, lesson_count: c.lesson_count },
        ]),
      )
    } catch {}
  }

  const completedCourses = courses.filter((c) => c.completed).length

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <PageHeader
        title={`¡Hola, ${employee.first_name}!`}
        description="Tu ruta de capacitación activa"
      />

      <EmployeeLearningRefresh autoRefresh pollIntervalMs={60_000} />

      {learningData?.syncError ? (
        <Alert
          severity="warning"
          sx={{
            borderRadius: 2,
            border: "1px solid #fde68a",
            bgcolor: "#fffbeb",
            color: "#78350f",
          }}
        >
          No pudimos refrescar tu avance. Mostramos el último dato guardado.
        </Alert>
      ) : null}

      {!learningData?.syncError && learningData?.backgroundSyncQueued ? (
        <Alert
          severity="info"
          sx={{
            borderRadius: 2,
            border: "1px solid #bae6fd",
            bgcolor: "#f0f9ff",
            color: "#0c4a6e",
          }}
        >
          Verificando tu avance más reciente. La vista se actualizará automáticamente.
        </Alert>
      ) : null}

      {courses.length === 0 ? (
        <EmptyState message="Tu ruta de aprendizaje está siendo preparada." />
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", xl: "1fr 1fr 1fr" },
          }}
        >
          {courses.map((course) => {
            const courseUrl = getCourseUrl(course.wp_course_id, courseUrlById, fallbackUrlById)
            const launchUrl = buildWordPressCourseLaunchUrl({
              wpUserId: employee.wp_user_id,
              courseUrl,
            })
            const thumbnail = thumbnailById.get(course.wp_course_id)
            const dc3Meta = dc3MetaMap.get(course.wp_course_id)
            const pkgMeta = pkgCourseMap.get(course.wp_course_id)
            const hasError = course.access_status === "ERROR"
            const inProgress = !course.completed && course.progress_pct > 0
            const barColor = course.progress_pct > 0 ? "var(--portal-blue)" : "#94a3b8"
            const duracionLabel = dc3Meta?.duration_hours
              ? `${Math.round(dc3Meta.duration_hours)}h`
              : null
            const hasDc3 = !!dc3Meta

            return (
              <Paper
                key={course.id}
                elevation={0}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  borderRadius: 2.5,
                  border: "1px solid #f0f0f0",
                  bgcolor: "background.paper",
                }}
              >
                {thumbnail ? (
                  <Box sx={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbnail}
                      alt={course.course_name}
                      style={{ height: 144, width: "100%", objectFit: "cover", display: "block" }}
                    />
                    {duracionLabel && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 8,
                          right: 8,
                          borderRadius: 1,
                          bgcolor: "rgba(0,0,0,0.6)",
                          px: 0.75,
                          py: 0.375,
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "#fff",
                        }}
                      >
                        {duracionLabel}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      position: "relative",
                      display: "flex",
                      height: 96,
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "var(--portal-blue-soft)",
                    }}
                  >
                    <Typography
                      sx={{ fontSize: 30, fontWeight: 800, color: "var(--portal-blue)", opacity: 0.4 }}
                    >
                      {course.course_name.charAt(0).toUpperCase()}
                    </Typography>
                    {duracionLabel && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 8,
                          right: 8,
                          borderRadius: 1,
                          bgcolor: "rgba(0,0,0,0.6)",
                          px: 0.75,
                          py: 0.375,
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "#fff",
                        }}
                      >
                        {duracionLabel}
                      </Box>
                    )}
                  </Box>
                )}

                <Box sx={{ display: "flex", flex: 1, flexDirection: "column", p: 2 }}>
                  <Box
                    sx={{
                      mb: 1,
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1a1a1a",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {course.course_name}
                    </Typography>
                    <StatusBadge
                      variant={course.completed ? "green" : inProgress ? "amber" : "slate"}
                    >
                      {course.completed ? "Completado" : inProgress ? "En progreso" : "Sin iniciar"}
                    </StatusBadge>
                  </Box>

                  {pkgMeta?.description && (
                    <Typography
                      sx={{
                        mb: 1,
                        fontSize: 11,
                        color: "#64748b",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {pkgMeta.description}
                    </Typography>
                  )}

                  {(pkgMeta?.lesson_count || hasDc3) && (
                    <Box sx={{ mb: 1, display: "flex", gap: 1.5 }}>
                      {pkgMeta?.lesson_count && (
                        <Typography
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            fontSize: "11px",
                            color: "#94a3b8",
                          }}
                        >
                          <ClipboardList size={12} /> {pkgMeta.lesson_count} lecciones
                        </Typography>
                      )}
                      {hasDc3 && (
                        <Typography
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--portal-blue)",
                          }}
                        >
                          <Award size={12} /> DC-3
                        </Typography>
                      )}
                    </Box>
                  )}

                  <Box
                    sx={{
                      mb: 0.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>Avance</Typography>
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a" }}>
                      {course.progress_pct}%
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      mb: 2,
                      height: 6,
                      overflow: "hidden",
                      borderRadius: "999px",
                      bgcolor: "#f0f0f0",
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        borderRadius: "999px",
                        bgcolor: barColor,
                        width: `${course.progress_pct}%`,
                      }}
                    />
                  </Box>

                  {hasError && course.access_error ? (
                    <Box sx={{ mb: 1.5, borderRadius: 2, bgcolor: "#fff1f2", px: 1.5, py: 1 }}>
                      <Typography sx={{ fontSize: 11, color: "#881337" }}>
                        {course.access_error}
                      </Typography>
                    </Box>
                  ) : null}

                  {course.completed && course.completed_at ? (
                    <Typography sx={{ mb: 1.5, fontSize: "11px", color: "#94a3b8" }}>
                      Completado: {formatDateTime(course.completed_at)}
                    </Typography>
                  ) : null}

                  <Box sx={{ mt: "auto" }}>
                    {launchUrl ? (
                      <Button
                        component="a"
                        href={launchUrl}
                        target="_blank"
                        rel="noreferrer"
                        variant="contained"
                        fullWidth
                        disableElevation
                        sx={{
                          borderRadius: 2.5,
                          py: 1.25,
                          fontSize: 13,
                          fontWeight: 600,
                          bgcolor: course.completed ? "var(--portal-blue)" : "#1a1a1a",
                          color: "#fff",
                          "&:hover": { bgcolor: course.completed ? "var(--portal-blue-hover)" : "#333" },
                        }}
                      >
                        {course.completed
                          ? "Repasar"
                          : course.progress_pct > 0
                            ? "Continuar"
                            : "Iniciar"}
                      </Button>
                    ) : (
                      <Typography sx={{ textAlign: "center", fontSize: 11, color: "#94a3b8" }}>
                        Sin URL disponible
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Paper>
            )
          })}
        </Box>
      )}

      {completedCourses > 0 ? (
        <Paper
          elevation={0}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            borderRadius: 2.5,
            border: "1px solid #f0f0f0",
            bgcolor: "background.paper",
            px: 2.5,
            py: 2,
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
              color: "var(--portal-blue)",
            }}
          >
            <Award size={16} strokeWidth={2} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
              Tienes {completedCourses} curso{completedCourses > 1 ? "s" : ""} completado
              {completedCourses > 1 ? "s" : ""}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "#64748b" }}>
              Descarga tus constancias DC-3 oficiales STPS.
            </Typography>
          </Box>
          <Button
            component="a"
            href="/employee/certificates"
            variant="contained"
            disableElevation
            sx={{
              flexShrink: 0,
              borderRadius: 2.5,
              px: 2,
              py: 1,
              fontSize: 13,
              fontWeight: 600,
              bgcolor: "var(--portal-blue)",
              color: "#fff",
              "&:hover": { bgcolor: "var(--portal-blue-hover)" },
            }}
          >
            Ver constancias
          </Button>
        </Paper>
      ) : null}
    </Box>
  )
}
