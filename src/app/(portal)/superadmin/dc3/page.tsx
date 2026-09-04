import Dc3EditorList, { type CourseEntry } from "@/components/company/Dc3EditorList"
import { slate } from "@/lib/theme-tokens"
import { getSuperadminDc3Snapshot } from "@/lib/dashboard-cache"
import { decodeHtmlEntities } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { PageHeader } from "@/components/shared/PageHeader"
import { FileText } from "lucide-react"
import { redirect } from "next/navigation"
import { saveDc3MetadataAction, syncDc3MetadataAction } from "./actions"
import Box from "@mui/material/Box"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SuperadminDc3Page({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== "SUPERADMIN") redirect("/login")

  const params = await searchParams
  const openParam = readSearchParam(params, "open")
  const openCourseId = openParam ? Number(openParam) : null

  const { publishedCourses, metadata } = await getSuperadminDc3Snapshot()

  const metadataMap = new Map(metadata.map((m) => [m.wp_course_id, m]))

  const courses: CourseEntry[] = publishedCourses.map((course) => ({
    wpCourseId: course.wp_course_id,
    courseName: decodeHtmlEntities(course.title),
    metadata: metadataMap.get(course.wp_course_id) ?? null,
  }))

  const total = courses.length

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <PageHeader
        title="Editor DC-3"
        description="Configura la metadata oficial STPS por curso para emitir constancias DC-3 correctas."
      />

      {total === 0 ? (
        <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Box sx={{ py: 6, textAlign: "center" }}>
            <FileText size={32} style={{ color: slate[300], margin: "0 auto 12px" }} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No se encontraron cursos publicados en el catálogo de WordPress/Tutor LMS.
            </Typography>
          </Box>
        </Paper>
      ) : (
        <Dc3EditorList
          courses={courses}
          action={saveDc3MetadataAction}
          syncAction={syncDc3MetadataAction}
          openCourseId={openCourseId}
        />
      )}
    </Box>
  )
}
