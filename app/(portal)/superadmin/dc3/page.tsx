import Dc3EditorList, { type CourseEntry } from "@/components/empresa/Dc3EditorList"
import { getSuperadminDc3Snapshot } from "@/lib/dashboard-cache"
import { decodeHtmlEntities } from "@/lib/format"
import { getSession } from "@/lib/session"
import { PageHeader } from "@/components/superadmin/PageHeader"
import { AlertCircle, AlertTriangle, BarChart3, CheckCircle2, FileText } from "lucide-react"
import { redirect } from "next/navigation"
import { saveDc3MetadataAction, syncDc3MetadataAction } from "./actions"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"

function isComplete(m: CourseEntry["metadata"]): boolean {
  if (!m) return false
  return !!(m.duracion_horas != null && m.area_tematica_nombre && m.agente_capacitador_nombre && m.instructor_nombre)
}

export default async function SuperadminDc3Page() {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const { publishedCourses, metadata, paqueteCursos } = await getSuperadminDc3Snapshot()

  const packagesByCourseId = new Map<number, string[]>()
  for (const pc of paqueteCursos) {
    const existing = packagesByCourseId.get(pc.wp_curso_id)
    if (existing) {
      if (!existing.includes(pc.paquete.nombre)) existing.push(pc.paquete.nombre)
    } else {
      packagesByCourseId.set(pc.wp_curso_id, [pc.paquete.nombre])
    }
  }

  const metadataMap = new Map(metadata.map((m) => [m.wp_curso_id, m]))

  const courses: CourseEntry[] = publishedCourses.map((course) => ({
    wp_curso_id: course.wp_course_id,
    nombre_curso: decodeHtmlEntities(course.title),
    paquetes: packagesByCourseId.get(course.wp_course_id) ?? [],
    metadata: metadataMap.get(course.wp_course_id) ?? null,
  }))

  const total      = courses.length
  const complete   = courses.filter((c) => isComplete(c.metadata)).length
  const incomplete = courses.filter((c) => c.metadata && !isComplete(c.metadata)).length
  const empty      = courses.filter((c) => !c.metadata).length
  const pct        = total ? Math.round((complete / total) * 100) : 0
  const barColor   = pct === 100 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#f43f5e"

  const kpis = [
    { label: "Total en catálogo",  value: total,      sub: "Cursos publicados",        icon: FileText,      bg: "#f8fafc", color: "#475569" },
    { label: "DC-3 completos",     value: complete,   sub: "4/4 campos obligatorios",  icon: CheckCircle2,  bg: "#f0fdf4", color: "#16a34a" },
    { label: "Incompletos",        value: incomplete, sub: "Con datos parciales",       icon: AlertCircle,   bg: "#fffbeb", color: "#d97706" },
    { label: "Sin datos",          value: empty,      sub: "Sin ningún campo",          icon: AlertTriangle, bg: empty > 0 ? "#fef2f2" : "#f8fafc", color: empty > 0 ? "#dc2626" : "#64748b" },
  ]

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <PageHeader
        breadcrumb="SuperAdmin · Operaciones"
        title="Editor DC-3"
        description="Configura la metadata oficial STPS por curso para emitir constancias DC-3 correctas."
      />

      {/* KPI strip */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", xl: "repeat(4,1fr)" } }}>
        {kpis.map(({ label, value, sub, icon: Icon, bg, color }) => (
          <Paper
            key={label}
            elevation={0}
            sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}
          >
            <Box sx={{ p: 2.5, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{label}</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 30, fontWeight: 700, color: "text.primary", lineHeight: 1 }}>
                  {value}
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary" }}>{sub}</Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: bg,
                  color,
                  flexShrink: 0,
                }}
              >
                <Icon size={16} strokeWidth={2} />
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Warning */}
      {incomplete + empty > 0 && (
        <Alert
          severity="warning"
          icon={<AlertTriangle size={16} />}
          sx={{ borderRadius: 2, border: "1px solid #fde68a", bgcolor: "#fffbeb", color: "#92400e" }}
        >
          <strong>{incomplete + empty} cursos sin metadata DC-3 completa</strong>
          <br />
          Las constancias no podrán generarse hasta completar el CNO-11, área temática y agente capacitador.
        </Alert>
      )}

      {/* Progress bar */}
      {total > 0 && (
        <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ mb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BarChart3 size={15} style={{ color: "#94a3b8" }} />
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>
                  Completitud global del catálogo
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>{pct}%</Typography>
            </Box>
            <Box sx={{ height: 8, borderRadius: "999px", overflow: "hidden", bgcolor: "#f1f5f9" }}>
              <Box sx={{ height: "100%", width: `${pct}%`, borderRadius: "999px", bgcolor: barColor, transition: "width 0.3s ease" }} />
            </Box>
            <Typography sx={{ mt: 1, fontSize: 11, color: "text.disabled" }}>
              {complete} de {total} cursos tienen los 4 campos obligatorios completos.
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Course list */}
      {total === 0 ? (
        <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Box sx={{ py: 6, textAlign: "center" }}>
            <FileText size={32} style={{ color: "#cbd5e1", margin: "0 auto 12px" }} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No se encontraron cursos publicados en el catálogo de WordPress/Tutor LMS.
            </Typography>
          </Box>
        </Paper>
      ) : (
        <Dc3EditorList courses={courses} action={saveDc3MetadataAction} syncAction={syncDc3MetadataAction} />
      )}
    </Box>
  )
}
