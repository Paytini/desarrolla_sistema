import KpiCard from "@/components/shared/KpiCard"
import { PageHeader } from "@/components/shared/PageHeader"
import { RingChart } from "@/components/shared/RingChart"
import StatusBadge from "@/components/shared/StatusBadge"
import EmployeeLearningRefresh from "@/components/empleado/EmployeeLearningRefresh"
import { getEmployeeLearningData } from "@/lib/employee-learning"
import { formatDateTime } from "@/lib/format"
import type { PortalCourseRecord } from "@/lib/learning-types"
import { getSession } from "@/lib/session"
import {
  buildWordPressCourseLaunchUrl,
  getWordPressSiteUrl,
  isWordPressBridgeConfigured,
} from "@/lib/wordpress-bridge"
import { getWordPressCourseCatalog } from "@/lib/wordpress-course-catalog"
import { Award, BookOpen, CheckCircle, Clock } from "lucide-react"
import { redirect } from "next/navigation"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"

function getCourseUrl(
  courseId: number,
  courseUrlById: Map<number, string>,
  fallbackUrlById: Map<number, string>
) {
  const direct = courseUrlById.get(courseId)
  if (direct) return direct
  const fallback = fallbackUrlById.get(courseId)
  if (fallback) return fallback
  const siteUrl = getWordPressSiteUrl()
  return siteUrl ? `${siteUrl}/?p=${courseId}` : null
}


export default async function EmpleadoCursos() {
  const session = await getSession()
  if (!session || session.user.rol !== "EMPLEADO" || !session.user.empresa_id) {
    redirect("/login")
  }

  const learningData = await getEmployeeLearningData(session.user.email ?? "")
  const empleado     = learningData?.empleado
  if (!empleado) redirect("/login")

  let courseUrlById   = new Map<number, string>()
  let fallbackUrlById = new Map<number, string>()
  let thumbnailById   = new Map<number, string>()

  if (isWordPressBridgeConfigured()) {
    try {
      const bridgeCourses = await getWordPressCourseCatalog()
      courseUrlById = new Map(
        bridgeCourses.courses
          .filter((c) => c.course_url)
          .map((c) => [c.wp_course_id, c.course_url as string])
      )
      const siteUrl = getWordPressSiteUrl()
      fallbackUrlById = new Map(
        bridgeCourses.courses
          .filter((c) => c.post_type && siteUrl)
          .map((c) => [c.wp_course_id, `${siteUrl}/?post_type=${c.post_type}&p=${c.wp_course_id}`])
      )
      thumbnailById = new Map(
        bridgeCourses.courses
          .filter((c) => c.thumbnail_url)
          .map((c) => [c.wp_course_id, c.thumbnail_url as string])
      )
    } catch {}
  }

  if (session.user.empresa_id) {
    try {
      const { prisma } = await import("@/lib/prisma")
      const pkg = await prisma.empresa.findUnique({
        where: { id: session.user.empresa_id },
        select: {
          paquetes: {
            where: { activo: true },
            select: {
              paquete: {
                select: { cursos: { select: { wp_curso_id: true, portada_url: true } } },
              },
            },
            take: 1,
          },
        },
      })
      for (const c of pkg?.paquetes[0]?.paquete?.cursos ?? []) {
        if (c.portada_url) thumbnailById.set(c.wp_curso_id, c.portada_url)
      }
    } catch {}
  }

  const cursos = empleado.cursos as PortalCourseRecord[]

  let dc3MetaMap  = new Map<number, { duracion_horas: number | null }>()
  let pkgCourseMap = new Map<number, { descripcion: string | null; num_lecciones: number | null }>()

  if (session.user.empresa_id && cursos.length > 0) {
    try {
      const { prisma } = await import("@/lib/prisma")
      const wpIds = cursos.map((c) => c.wp_curso_id)
      const [dc3MetaRecords, pkgCourses] = await Promise.all([
        prisma.cursoDc3Metadata.findMany({
          where: { wp_curso_id: { in: wpIds } },
          select: { wp_curso_id: true, duracion_horas: true },
        }),
        prisma.paqueteCurso.findMany({
          where: { wp_curso_id: { in: wpIds } },
          select: { wp_curso_id: true, descripcion: true, num_lecciones: true },
          distinct: ["wp_curso_id"],
        }),
      ])
      dc3MetaMap  = new Map(dc3MetaRecords.map((m) => [m.wp_curso_id, { duracion_horas: m.duracion_horas }]))
      pkgCourseMap = new Map(pkgCourses.map((c) => [c.wp_curso_id, { descripcion: c.descripcion, num_lecciones: c.num_lecciones }]))
    } catch {}
  }

  const cursosCompletados = cursos.filter((c) => c.completado).length
  const cursosEnProgreso  = cursos.filter((c) => !c.completado && c.progreso_pct > 0).length
  const cursosPendientes  = cursos.filter((c) => c.progreso_pct === 0).length
  const avancePromedio    = cursos.length
    ? Math.round(cursos.reduce((s, c) => s + c.progreso_pct, 0) / cursos.length)
    : 0

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <PageHeader
        title={`¡Hola, ${empleado.nombre}!`}
        description="Tu ruta de capacitación activa"
        accentColor="#34D399"
      />

      {/* KPI strip */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", xl: "repeat(4,1fr)" } }}>
        <KpiCard label="Completados"  value={String(cursosCompletados)} sub={`de ${cursos.length} cursos`} icon={CheckCircle} borderColor="green" />
        <KpiCard label="En progreso"  value={String(cursosEnProgreso)}  sub="iniciados"  icon={BookOpen} borderColor="amber" />
        <KpiCard label="Sin iniciar"  value={String(cursosPendientes)}  sub="pendientes" icon={Clock}    borderColor="charcoal" />

        {/* Avance global with ring chart */}
        <Paper
          elevation={0}
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 2.5,
            border: "1px solid #f0f0f0",
            borderLeft: "4px solid #F5853F",
            bgcolor: "background.paper",
            p: 2.5,
          }}
        >
          <Typography sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8" }}>
            Avance global
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 28, fontWeight: 700, lineHeight: 1, color: "#1a1a1a" }}>
            {avancePromedio}%
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 11, color: "#64748b" }}>promedio</Typography>
          <Box sx={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
            <RingChart
              pct={avancePromedio}
              size={72}
              sw={7}
              color={avancePromedio >= 80 ? "#10B981" : avancePromedio >= 40 ? "#F59E0B" : "#EF4444"}
            />
          </Box>
        </Paper>
      </Box>

      <EmployeeLearningRefresh autoRefresh pollIntervalMs={15_000} />

      {learningData?.syncError ? (
        <Alert severity="warning" sx={{ borderRadius: 2, border: "1px solid #fde68a", bgcolor: "#fffbeb", color: "#78350f" }}>
          No pudimos refrescar tu avance. Mostramos el último dato guardado.
        </Alert>
      ) : null}

      {!learningData?.syncError && learningData?.backgroundSyncQueued ? (
        <Alert severity="info" sx={{ borderRadius: 2, border: "1px solid #bae6fd", bgcolor: "#f0f9ff", color: "#0c4a6e" }}>
          Verificando tu avance con Tutor LMS. La vista se actualizará automáticamente.
        </Alert>
      ) : null}

      {/* Course grid */}
      {cursos.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            border: "1px dashed",
            borderColor: "divider",
            py: 6,
            textAlign: "center",
          }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Aún no tienes cursos sincronizados. Pide a RH o a SuperAdmin que ejecute la sincronización.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", xl: "1fr 1fr 1fr" } }}>
          {cursos.map((curso) => {
            const courseUrl = getCourseUrl(curso.wp_curso_id, courseUrlById, fallbackUrlById)
            const launchUrl = buildWordPressCourseLaunchUrl({ wpUserId: empleado.wp_user_id, courseUrl })
            const thumbnail  = thumbnailById.get(curso.wp_curso_id)
            const dc3Meta    = dc3MetaMap.get(curso.wp_curso_id)
            const pkgMeta    = pkgCourseMap.get(curso.wp_curso_id)
            const hasError   = curso.acceso_estado === "ERROR"
            const enProgreso = !curso.completado && curso.progreso_pct > 0
            const barColor   = curso.completado ? "#34D399" : enProgreso ? "#8B5CF6" : "#94a3b8"
            const duracionLabel = dc3Meta?.duracion_horas ? `${Math.round(dc3Meta.duracion_horas)}h` : null
            const hasDc3     = !!dc3Meta

            return (
              <Paper
                key={curso.id}
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
                {/* Thumbnail */}
                {thumbnail ? (
                  <Box sx={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbnail} alt="" style={{ height: 144, width: "100%", objectFit: "cover", display: "block" }} />
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
                  <Box sx={{ position: "relative", display: "flex", height: 96, alignItems: "center", justifyContent: "center", bgcolor: "#fff2eb" }}>
                    <Typography sx={{ fontSize: 30, fontWeight: 800, color: "#F5853F", opacity: 0.4 }}>
                      {curso.nombre_curso.charAt(0).toUpperCase()}
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
                  {/* Title + badge */}
                  <Box sx={{ mb: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
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
                      {curso.nombre_curso}
                    </Typography>
                    <StatusBadge variant={curso.completado ? "green" : enProgreso ? "amber" : "slate"}>
                      {curso.completado ? "Completado" : enProgreso ? "En progreso" : "Sin iniciar"}
                    </StatusBadge>
                  </Box>

                  {/* Description */}
                  {pkgMeta?.descripcion && (
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
                      {pkgMeta.descripcion}
                    </Typography>
                  )}

                  {/* Meta row */}
                  {(pkgMeta?.num_lecciones || hasDc3) && (
                    <Box sx={{ mb: 1, display: "flex", gap: 1.5 }}>
                      {pkgMeta?.num_lecciones && (
                        <Typography sx={{ fontSize: "11px", color: "#94a3b8" }}>
                          📋 {pkgMeta.num_lecciones} lecciones
                        </Typography>
                      )}
                      {hasDc3 && (
                        <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#F5853F" }}>
                          🏅 DC-3
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Progress bar */}
                  <Box sx={{ mb: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>Avance</Typography>
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a" }}>{curso.progreso_pct}%</Typography>
                  </Box>
                  <Box sx={{ mb: 2, height: 6, overflow: "hidden", borderRadius: "999px", bgcolor: "#f0f0f0" }}>
                    <Box sx={{ height: "100%", borderRadius: "999px", bgcolor: barColor, width: `${curso.progreso_pct}%` }} />
                  </Box>

                  {/* Error notice */}
                  {hasError && curso.acceso_error ? (
                    <Box sx={{ mb: 1.5, borderRadius: 2, bgcolor: "#fff1f2", px: 1.5, py: 1 }}>
                      <Typography sx={{ fontSize: 11, color: "#881337" }}>{curso.acceso_error}</Typography>
                    </Box>
                  ) : null}

                  {/* Completion date */}
                  {curso.completado && curso.fecha_completado ? (
                    <Typography sx={{ mb: 1.5, fontSize: "11px", color: "#94a3b8" }}>
                      Completado: {formatDateTime(curso.fecha_completado)}
                    </Typography>
                  ) : null}

                  {/* CTA */}
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
                          bgcolor: curso.completado ? "#F5853F" : "#1a1a1a",
                          color: "#fff",
                          "&:hover": { bgcolor: curso.completado ? "#D96B20" : "#333" },
                        }}
                      >
                        {curso.completado ? "Repasar curso" : "Continuar curso"}
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

      {/* Constancias banner */}
      {cursosCompletados > 0 ? (
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
              bgcolor: "#fff2eb",
              color: "#F5853F",
            }}
          >
            <Award size={16} strokeWidth={2} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
              Tienes {cursosCompletados} curso{cursosCompletados > 1 ? "s" : ""} completado{cursosCompletados > 1 ? "s" : ""}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "#64748b" }}>
              Descarga tus constancias DC-3 oficiales STPS.
            </Typography>
          </Box>
          <Button
            component="a"
            href="/empleado/constancias"
            variant="contained"
            disableElevation
            sx={{
              flexShrink: 0,
              borderRadius: 2.5,
              px: 2,
              py: 1,
              fontSize: 13,
              fontWeight: 600,
              bgcolor: "#F5853F",
              color: "#fff",
              "&:hover": { bgcolor: "#D96B20" },
            }}
          >
            Ver constancias
          </Button>
        </Paper>
      ) : null}
    </Box>
  )
}
