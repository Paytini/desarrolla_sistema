"use client"

import { useEffect, useMemo, useState } from "react"
import Box from "@mui/material/Box"
import Checkbox from "@mui/material/Checkbox"
import CircularProgress from "@mui/material/CircularProgress"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import StatusNotice from "@/components/shared/StatusNotice"

type CourseOption = {
  wp_course_id: number
  title: string
  status?: string | null
  thumbnail_url?: string | null
}

type PackageCourseSelectorProps = {
  inputName?: string
}

export default function PackageCourseSelector({
  inputName = "selected_courses_json",
}: PackageCourseSelectorProps) {
  const [courses, setCourses]     = useState<CourseOption[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [query, setQuery]         = useState("")
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")

  useEffect(() => {
    let active = true
    async function loadCourses() {
      setLoading(true)
      setError("")
      try {
        const res = await fetch("/api/wordpress/courses", { method: "GET", cache: "no-store" })
        const payload = (await res.json()) as { courses?: CourseOption[]; message?: string }
        if (!res.ok) throw new Error(payload.message ?? "No fue posible cargar los cursos")
        if (active) {
          setCourses(
            (payload.courses ?? []).filter((c) => (c.status ? c.status === "publish" : true))
          )
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No fue posible cargar los cursos")
      } finally {
        if (active) setLoading(false)
      }
    }
    loadCourses()
    return () => { active = false }
  }, [])

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return courses
    return courses.filter((c) =>
      `${c.wp_course_id} ${c.title}`.toLowerCase().includes(q)
    )
  }, [courses, query])

  const selectedPayload = useMemo(
    () =>
      JSON.stringify(
        courses
          .filter((c) => selectedIds.includes(c.wp_course_id))
          .map((c) => ({
            wp_course_id:  c.wp_course_id,
            nombre_curso:  c.title,
            portada_url:   c.thumbnail_url ?? null,
          }))
      ),
    [courses, selectedIds]
  )

  function toggleCourse(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <input type="hidden" name={inputName} value={selectedPayload} />

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { md: "center" },
          justifyContent: { md: "space-between" },
          gap: 1.5,
        }}
      >
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por ID o nombre del curso"
          size="small"
          sx={{ flexGrow: 1 }}
        />
        <Typography variant="body2" sx={{ color: "text.secondary", flexShrink: 0 }}>
          {selectedIds.length} curso{selectedIds.length === 1 ? "" : "s"} seleccionado{selectedIds.length === 1 ? "" : "s"}
        </Typography>
      </Box>

      <Box
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.default",
          p: 1.5,
        }}
      >
        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 2 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Cargando cursos desde WordPress...
            </Typography>
          </Box>
        )}

        {error && (
          <StatusNotice
            tone="error"
            title="No fue posible cargar cursos desde WordPress"
            message={error}
          />
        )}

        {!loading && !error && filteredCourses.length === 0 && (
          <Typography variant="body2" sx={{ py: 2, color: "text.secondary" }}>
            No se encontraron cursos disponibles.
          </Typography>
        )}

        {!loading && !error && (
          <Box sx={{ display: "grid", gap: 1, maxHeight: 320, overflowY: "auto" }}>
            {filteredCourses.map((course) => {
              const checked = selectedIds.includes(course.wp_course_id)
              return (
                <Box
                  key={course.wp_course_id}
                  onClick={() => toggleCourse(course.wp_course_id)}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.25,
                    p: 1.5,
                    borderRadius: "10px",
                    border: "1px solid",
                    borderColor: checked ? "rgba(245,133,63,0.3)" : "divider",
                    bgcolor: checked ? "rgba(245,133,63,0.04)" : "background.paper",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                    "&:hover": { borderColor: "primary.main" },
                  }}
                >
                  <Checkbox
                    checked={checked}
                    size="small"
                    onChange={() => toggleCourse(course.wp_course_id)}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ p: 0, mt: 0.25, color: "divider", "&.Mui-checked": { color: "primary.main" } }}
                  />
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>
                      {course.title}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                      ID Tutor LMS: {course.wp_course_id}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}
      </Box>
    </Box>
  )
}
