"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { BookOpen, Check, ChevronLeft, ChevronRight, Minus, Search, X } from "lucide-react"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { DataTable } from "@/components/shared/DataTable"
import ProgressBar from "@/components/shared/ProgressBar"
import StatusToast from "@/components/shared/StatusToast"
import { kpiColorMap, type KpiColorKey } from "@/lib/kpi-colors"
import { setCourseAssignmentsAction } from "./actions"

const EMPLOYEES_PAGE_SIZE = 10

type CourseInfo = {
  wp_course_id: number
  course_name: string
  cover_url: string | null
}

type EmployeeInfo = {
  id: string
  name: string
  email: string
  department: string | null
  position: string | null
}

type AssignmentBoardProps = {
  courses: CourseInfo[]
  employees: EmployeeInfo[]
  initialAssignments: Record<number, string[]>
}

const COLOR_ROTATION: KpiColorKey[] = [
  "primary",
  "emerald",
  "amber",
  "orange",
  "violet",
  "pink",
  "rose",
  "charcoal",
]

function cloneAssignments(source: Record<number, string[]>): Record<number, Set<string>> {
  const result: Record<number, Set<string>> = {}
  for (const [courseId, ids] of Object.entries(source)) {
    result[Number(courseId)] = new Set(ids)
  }
  return result
}

export default function AssignmentBoard({
  courses,
  employees,
  initialAssignments,
}: AssignmentBoardProps) {
  const [savedAssignments, setSavedAssignments] = useState(() =>
    cloneAssignments(initialAssignments),
  )
  const [workingAssignments, setWorkingAssignments] = useState(() =>
    cloneAssignments(initialAssignments),
  )
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
    courses[0]?.wp_course_id ?? null,
  )
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [courseSearch, setCourseSearch] = useState(searchParams.get("curso") ?? "")
  const [employeeSearch, setEmployeeSearch] = useState(searchParams.get("q") ?? "")
  const [department, setDepartment] = useState(searchParams.get("depto") ?? "")
  const [position, setPosition] = useState(searchParams.get("puesto") ?? "")

  useEffect(() => {
    const params = new URLSearchParams()
    if (courseSearch) params.set("curso", courseSearch)
    if (employeeSearch) params.set("q", employeeSearch)
    if (department) params.set("depto", department)
    if (position) params.set("puesto", position)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [courseSearch, employeeSearch, department, position, pathname, router])
  const [feedback, setFeedback] = useState<{
    id: number
    tone: "success" | "error"
    message: string
  } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [unassignConfirmOpen, setUnassignConfirmOpen] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)

  const departments = useMemo(
    () =>
      [
        ...new Set(employees.map((e) => e.department).filter((v): v is string => Boolean(v))),
      ].sort(),
    [employees],
  )
  const positions = useMemo(
    () =>
      [...new Set(employees.map((e) => e.position).filter((v): v is string => Boolean(v)))].sort(),
    [employees],
  )

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase()
    if (!q) return courses
    return courses.filter((c) => c.course_name.toLowerCase().includes(q))
  }, [courses, courseSearch])

  const selectedCourse = courses.find((c) => c.wp_course_id === selectedCourseId) ?? null

  const workingSet =
    selectedCourseId != null
      ? (workingAssignments[selectedCourseId] ?? new Set<string>())
      : new Set<string>()
  const savedSet = useMemo(
    () =>
      selectedCourseId != null
        ? (savedAssignments[selectedCourseId] ?? new Set<string>())
        : new Set<string>(),
    [selectedCourseId, savedAssignments],
  )
  const isDirty =
    workingSet.size !== savedSet.size || [...workingSet].some((id) => !savedSet.has(id))

  const hasEmployeeFilters = Boolean(employeeSearch || department || position)

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase()
    const matches = employees.filter((e) => {
      if (department && e.department !== department) return false
      if (position && e.position !== position) return false
      if (q && !`${e.name} ${e.email}`.toLowerCase().includes(q)) return false
      return true
    })
    return matches
      .map((employee, index) => ({ employee, index, assigned: savedSet.has(employee.id) }))
      .sort((a, b) => {
        if (a.assigned !== b.assigned) return a.assigned ? -1 : 1
        return a.index - b.index
      })
      .map((entry) => entry.employee)
  }, [employees, employeeSearch, department, position, savedSet])

  const allFilteredAssigned =
    filteredEmployees.length > 0 && filteredEmployees.every((e) => workingSet.has(e.id))
  const someFilteredAssigned = filteredEmployees.some((e) => workingSet.has(e.id))

  const employeeFilterKey = `${selectedCourseId}|${employeeSearch}|${department}|${position}`

  function selectCourse(courseId: number) {
    setSelectedCourseId(courseId)
    setFeedback(null)
  }

  function toggleEmployee(employeeId: string) {
    if (selectedCourseId == null) return
    setWorkingAssignments((prev) => {
      const next = { ...prev }
      const set = new Set(next[selectedCourseId] ?? [])
      if (set.has(employeeId)) set.delete(employeeId)
      else set.add(employeeId)
      next[selectedCourseId] = set
      return next
    })
    setFeedback(null)
  }

  function bulkSetVisible(shouldAssign: boolean) {
    if (selectedCourseId == null) return
    setWorkingAssignments((prev) => {
      const next = { ...prev }
      const set = new Set(next[selectedCourseId] ?? [])
      for (const employee of filteredEmployees) {
        if (shouldAssign) set.add(employee.id)
        else set.delete(employee.id)
      }
      next[selectedCourseId] = set
      return next
    })
    setFeedback(null)
  }

  function handleSave() {
    if (selectedCourseId == null) return
    const employeeIds = [...workingSet]
    startTransition(async () => {
      const result = await setCourseAssignmentsAction(selectedCourseId, employeeIds)
      if (result.ok) {
        setSavedAssignments((prev) => ({ ...prev, [selectedCourseId]: new Set(employeeIds) }))
      }
      setFeedback({
        id: Date.now(),
        tone: result.ok ? "success" : "error",
        message: result.message,
      })
    })
  }

  function confirmBulkUnassign() {
    bulkSetVisible(false)
    setUnassignConfirmOpen(false)
  }

  function scrollCourses(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: direction * 300, behavior: "smooth" })
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: "var(--portal-blue)" }}
            >
              1
            </span>
            <h2 className="text-base font-semibold text-slate-950">Elige el curso</h2>
            <span className="text-sm font-normal text-slate-400">
              {filteredCourses.length} de {courses.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder="Buscar curso..."
                className="w-56 rounded-lg border border-portal-border py-2 pl-8 pr-8 text-sm outline-none transition focus:border-portal-blue"
              />
              {courseSearch ? (
                <button
                  type="button"
                  onClick={() => setCourseSearch("")}
                  aria-label="Limpiar búsqueda de curso"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => scrollCourses(-1)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-portal-border text-slate-500 transition hover:bg-gray-50"
              aria-label="Desplazar cursos a la izquierda"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollCourses(1)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-portal-border text-slate-500 transition hover:bg-gray-50"
              aria-label="Desplazar cursos a la derecha"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
            <p>Sin resultados para &quot;{courseSearch}&quot;.</p>
            <button
              type="button"
              onClick={() => setCourseSearch("")}
              className="text-xs font-semibold text-portal-blue hover:underline"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div ref={scrollerRef} className="flex gap-3 overflow-x-auto pb-1 scroll-smooth">
            {filteredCourses.map((course) => {
              const originalIndex = courses.findIndex((c) => c.wp_course_id === course.wp_course_id)
              const colorKey = COLOR_ROTATION[originalIndex % COLOR_ROTATION.length]
              const color = kpiColorMap[colorKey]
              const courseSavedSet = savedAssignments[course.wp_course_id] ?? new Set<string>()
              const courseWorkingSet = workingAssignments[course.wp_course_id] ?? new Set<string>()
              const assignedCount = courseSavedSet.size
              const pct =
                employees.length > 0 ? Math.round((assignedCount / employees.length) * 100) : 0
              const isSelected = course.wp_course_id === selectedCourseId
              const hasPendingChanges =
                courseWorkingSet.size !== courseSavedSet.size ||
                [...courseWorkingSet].some((id) => !courseSavedSet.has(id))

              return (
                <button
                  key={course.wp_course_id}
                  type="button"
                  onClick={() => selectCourse(course.wp_course_id)}
                  className={`relative flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border bg-white text-left transition ${
                    isSelected
                      ? "border-portal-blue/50 ring-2 ring-portal-blue/15"
                      : "border-[#efefef] hover:border-portal-blue/30"
                  }`}
                >
                  <div className="relative h-36 w-full shrink-0">
                    {course.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={course.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center"
                        style={{ background: color.bg, color: color.text }}
                      >
                        <BookOpen size={40} />
                      </div>
                    )}
                    {isSelected && (
                      <span className="absolute right-2.5 top-2.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-portal-blue text-white shadow">
                        <Check size={13} strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 p-4">
                    <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-slate-800">
                      {course.course_name}
                    </p>

                    <ProgressBar value={pct} fillClassName="bg-portal-blue" />

                    <p className="text-xs font-medium text-slate-400">
                      {assignedCount} asignado{assignedCount !== 1 ? "s" : ""} · {pct}%
                      {hasPendingChanges ? (
                        <span className="ml-1 font-semibold text-amber-600">
                          · Cambios sin guardar
                        </span>
                      ) : null}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {selectedCourse && (
        <section className="space-y-3 rounded-xl border border-[#efefef] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: "var(--portal-blue)" }}
              >
                2
              </span>
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Asignar &laquo;{selectedCourse.course_name}&raquo;
                </h2>
              </div>
            </div>
            <span className="rounded-full bg-slate-950 px-4 py-2 text-center text-xs font-semibold text-white">
              <span className="block text-sm font-bold leading-none">{workingSet.size}</span>
              asignados
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Buscar colaborador..."
                className="w-full rounded-lg border border-portal-border py-2 pl-8 pr-8 text-sm outline-none transition focus:border-portal-blue"
              />
              {employeeSearch ? (
                <button
                  type="button"
                  onClick={() => setEmployeeSearch("")}
                  aria-label="Limpiar búsqueda de colaborador"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="rounded-lg border border-portal-border px-3 py-2 text-sm text-slate-600 outline-none"
            >
              <option value="">Todos los departamentos</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="rounded-lg border border-portal-border px-3 py-2 text-sm text-slate-600 outline-none"
            >
              <option value="">Todos los puestos</option>
              {positions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
              <p>Sin colaboradores para estos filtros.</p>
              {hasEmployeeFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setEmployeeSearch("")
                    setDepartment("")
                    setPosition("")
                  }}
                  className="text-xs font-semibold text-portal-blue hover:underline"
                >
                  Limpiar filtros
                </button>
              ) : null}
            </div>
          ) : (
            <DataTable
              key={employeeFilterKey}
              ariaLabel="Colaboradores"
              pageSize={EMPLOYEES_PAGE_SIZE}
              columns={[
                {
                  label: (
                    <div className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-200 transition has-[:checked]:border-portal-blue has-[:checked]:bg-portal-blue has-[:indeterminate]:border-portal-blue has-[:indeterminate]:bg-portal-blue">
                      <input
                        type="checkbox"
                        checked={allFilteredAssigned}
                        ref={(el) => {
                          if (el) el.indeterminate = someFilteredAssigned && !allFilteredAssigned
                        }}
                        onChange={() => {
                          if (allFilteredAssigned) {
                            setUnassignConfirmOpen(true)
                          } else {
                            bulkSetVisible(true)
                          }
                        }}
                        aria-label="Seleccionar todos los filtrados"
                        className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
                      />
                      <Check
                        size={10}
                        className="hidden text-white peer-checked:block"
                        strokeWidth={3}
                      />
                      <Minus
                        size={10}
                        className="hidden text-white peer-indeterminate:block"
                        strokeWidth={3}
                      />
                    </div>
                  ),
                },
                { label: "Empleado" },
                { label: "Departamento" },
                { label: "Puesto" },
              ]}
              rows={filteredEmployees.map((employee) => {
                const checked = workingSet.has(employee.id)
                return (
                  <tr
                    key={employee.id}
                    onClick={() => toggleEmployee(employee.id)}
                    className="cursor-pointer bg-white transition hover:bg-gray-50 has-[:checked]:bg-[#F3F8FE]"
                  >
                    <td className="w-10 rounded-l-lg py-3 pl-4">
                      <div className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-200 transition has-[:checked]:border-portal-blue has-[:checked]:bg-portal-blue">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEmployee(employee.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Asignar a ${employee.name}`}
                          className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
                        />
                        <Check
                          size={10}
                          className="hidden text-white peer-checked:block"
                          strokeWidth={3}
                        />
                      </div>
                    </td>
                    <td className="truncate px-4 py-3 text-sm font-semibold text-slate-900">
                      {employee.name}
                    </td>
                    <td className="truncate px-4 py-3 text-sm text-slate-500">
                      {employee.department ?? "Sin depto."}
                    </td>
                    <td className="truncate rounded-r-lg px-4 py-3 text-sm text-slate-500">
                      {employee.position ?? "Sin puesto"}
                    </td>
                  </tr>
                )
              })}
            />
          )}

          {feedback && (
            <StatusToast key={feedback.id} tone={feedback.tone} message={feedback.message} />
          )}

          <div className="-mx-4 -mb-4 border-t border-[#f5f5f5] bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || isPending}
                className="flex items-center gap-2 rounded-full bg-portal-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-portal-blue-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isPending ? "Guardando..." : "Guardar asignación"}
              </button>
            </div>
          </div>

          <ConfirmDialog
            open={unassignConfirmOpen}
            onClose={() => setUnassignConfirmOpen(false)}
            title={`¿Quitar a ${filteredEmployees.length} colaborador${filteredEmployees.length !== 1 ? "es" : ""} de «${selectedCourse.course_name}»?`}
            description="Se desasignará a todas las personas que coinciden con el filtro actual. Esta acción se aplica de inmediato al guardar."
            confirmLabel="Sí, quitar"
            confirmColor="error"
            action={confirmBulkUnassign}
          />
        </section>
      )}
    </div>
  )
}
