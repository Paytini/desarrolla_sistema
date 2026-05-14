"use client"

import { useEffect, useMemo, useState } from "react"
import StatusNotice from "@/components/portal/StatusNotice"

type CourseOption = {
  wp_course_id: number
  title: string
  status?: string | null
}

type PackageCourseSelectorProps = {
  inputName?: string
}

export default function PackageCourseSelector({
  inputName = "selected_courses_json",
}: PackageCourseSelectorProps) {
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    async function loadCourses() {
      setLoading(true)
      setError("")

      try {
        const response = await fetch("/api/wordpress/courses", {
          method: "GET",
          cache: "no-store",
        })

        const payload = (await response.json()) as {
          courses?: CourseOption[]
          message?: string
        }

        if (!response.ok) {
          throw new Error(payload.message || "No fue posible cargar los cursos")
        }

        if (active) {
          setCourses(
            (payload.courses ?? []).filter((course) =>
              course.status ? course.status === "publish" : true
            )
          )
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "No fue posible cargar los cursos")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadCourses()

    return () => {
      active = false
    }
  }, [])

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return courses

    return courses.filter((course) =>
      `${course.wp_course_id} ${course.title}`.toLowerCase().includes(normalizedQuery)
    )
  }, [courses, query])

  const selectedPayload = useMemo(() => {
    return JSON.stringify(
      courses
        .filter((course) => selectedIds.includes(course.wp_course_id))
        .map((course) => ({
          wp_course_id: course.wp_course_id,
          nombre_curso: course.title,
        }))
    )
  }, [courses, selectedIds])

  function toggleCourse(courseId: number) {
    setSelectedIds((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId]
    )
  }

  return (
    <div className="grid gap-3">
      <input type="hidden" name={inputName} value={selectedPayload} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por ID o nombre del curso"
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-teal-600"
        />
        <div className="text-sm text-slate-500">
          {selectedIds.length} curso{selectedIds.length === 1 ? "" : "s"} seleccionado{selectedIds.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        {loading ? (
          <p className="text-sm text-slate-500">Cargando cursos desde WordPress...</p>
        ) : null}

        {error ? (
          <StatusNotice
            tone="error"
            title="No fue posible cargar cursos desde WordPress"
            message={error}
          />
        ) : null}

        {!loading && !error && filteredCourses.length === 0 ? (
          <p className="text-sm text-slate-500">No se encontraron cursos disponibles.</p>
        ) : null}

        {!loading && !error ? (
          <div className="grid max-h-80 gap-2 overflow-y-auto">
            {filteredCourses.map((course) => {
              const checked = selectedIds.includes(course.wp_course_id)

              return (
                <label
                  key={course.wp_course_id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition ${
                    checked
                      ? "border-teal-300 bg-teal-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCourse(course.wp_course_id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700"
                  />
                  <div className="grid gap-1">
                    <p className="text-sm font-medium text-slate-900">{course.title}</p>
                    <p className="text-xs text-slate-500">ID Tutor LMS: {course.wp_course_id}</p>
                  </div>
                </label>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
