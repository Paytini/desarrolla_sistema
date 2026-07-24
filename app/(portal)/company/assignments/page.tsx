import { auth } from "@/auth"
import KpiCard from "@/components/shared/KpiCard"
import { PageHeader } from "@/components/shared/PageHeader"
import StatusNotice from "@/components/shared/StatusNotice"
import { BookOpen, Check, Package, Users } from "lucide-react"
import { SearchInput } from "@/components/shared/SearchInput"
import { getHrAssignmentsSnapshot } from "@/lib/dashboard-cache"
import type { PortalPackageCourseRecord } from "@/lib/learning-types"
import { readSearchParam } from "@/lib/search-params"
import { redirect } from "next/navigation"
import { assignEmployeeCoursesAction } from "./actions"

const successMessages: Record<string, string> = {
  asignado_local:
    "Los cursos fueron asignados en el portal. Si falta sincronizacion con WordPress, se completara en el siguiente sync.",
  asignado_sync:
    "Los cursos se asignaron correctamente y quedaron sincronizados con WordPress/Tutor LMS.",
  limpio_local:
    "Se actualizaron las asignaciones y el empleado quedo sin cursos activos dentro del portal.",
}

const errorMessages: Record<string, string> = {
  datos: "No fue posible identificar al empleado para actualizar asignaciones.",
  empleado: "No se encontro el empleado o no pertenece a tu empresa.",
  paquete: "Tu empresa no tiene un paquete activo asignado.",
  cursos: "Selecciona cursos validos del paquete activo.",
  bridge_sync:
    "Los cursos quedaron asignados en el portal, pero fallo la sincronizacion con WordPress. Revisa el bridge y vuelve a intentar.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type AssignmentEmployee = {
  id: number
  first_name: string
  last_name: string
  email: string
  department: string | null
  position: string | null
  courses: Array<{ wp_course_id: number }>
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export default async function CompanyAssignmentsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) redirect("/login")

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")

  const company = await getHrAssignmentsSnapshot(session.user.empresa_id)
  if (!company) redirect("/login")

  const activePackage = company.packages[0]?.package
  const packageCourses = (activePackage?.courses ?? []) as PortalPackageCourseRecord[]
  const allEmployees = company.employees as AssignmentEmployee[]

  const searchQuery = (readSearchParam(params, "q") ?? "").trim().toLowerCase()
  const employees = searchQuery
    ? allEmployees.filter((e) =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchQuery) ||
        e.email.toLowerCase().includes(searchQuery)
      )
    : allEmployees

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asignación de cursos"
        description="Asigna cursos del paquete activo a cada colaborador"
        breadcrumbs={[{ label: "Empresa", href: "/company/home" }, { label: "Asignaciones" }]}
      />

      {success ? (
        <StatusNotice tone="success" message={successMessages[success] ?? success} />
      ) : null}
      {error ? (
        <StatusNotice tone="error" message={errorMessages[error] ?? error} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Paquete activo" value={activePackage?.name ?? "Sin paquete"} sub="Catálogo disponible" icon={Package} borderColor="amber" />
        <KpiCard label="Cursos disponibles" value={String(packageCourses.length)} sub="Para asignar a empleados" icon={BookOpen} borderColor="orange" />
        <KpiCard label="Empleados activos" value={String(allEmployees.length)} sub="Elegibles para asignación" icon={Users} borderColor="charcoal" />
      </div>

      {!activePackage ? (
        <StatusNotice
          tone="error"
          message="No hay paquete activo para esta empresa. Solicita a SuperAdmin que asigne un paquete para habilitar asignaciones."
        />
      ) : null}

      {activePackage && packageCourses.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">
              Asignaciones por empleado
              {searchQuery && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  {employees.length} resultado{employees.length !== 1 ? "s" : ""}
                </span>
              )}
            </h2>
            <form className="flex gap-2">
              <SearchInput
                name="q"
                defaultValue={searchQuery}
                placeholder="Buscar empleado..."
                width={224}
              />
              <button
                type="submit"
                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#374151] transition hover:bg-gray-50"
              >
                Buscar
              </button>
              {searchQuery && (
                <a
                  href="?"
                  className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#6B7280] transition hover:bg-gray-50"
                >
                  Limpiar
                </a>
              )}
            </form>
          </div>

          {employees.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
              {searchQuery ? `Sin resultados para "${searchQuery}".` : "No hay empleados activos para asignar cursos."}
            </div>
          ) : null}

          {employees.map((employee) => {
            const assignedSet = new Set(employee.courses.map((c) => c.wp_course_id))
            const assignedCount = employee.courses.length
            const initials = getInitials(`${employee.first_name} ${employee.last_name}`)

            return (
              <article
                key={employee.id}
                className="overflow-hidden rounded-lg bg-white"
              >
                <form action={assignEmployeeCoursesAction}>
                  <input type="hidden" name="empleado_id" value={employee.id} />

                  <div className="flex items-center justify-between gap-4 border-b border-[#f5f5f5] px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF1FE] text-xs font-bold text-[#3579F5]">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {employee.first_name} {employee.last_name}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {employee.email}
                          {employee.department ? ` · ${employee.department}` : ""}
                          {employee.position ? ` · ${employee.position}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                        {assignedCount}/{packageCourses.length} cursos
                      </span>
                      <button
                        type="submit"
                        className="rounded-full bg-[#3579F5] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2A61D6]"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
                    {packageCourses.map((course) => (
                      <label
                        key={`${employee.id}-${course.wp_course_id}`}
                        className="group flex cursor-pointer items-center gap-3 rounded-xl border border-[#efefef] p-2.5 transition hover:border-[#3579F5]/30 hover:bg-[#F3F8FE] has-[:checked]:border-[#3579F5]/40 has-[:checked]:bg-[#F3F8FE]"
                      >
                        <input
                          type="checkbox"
                          name="course_ids"
                          value={course.wp_course_id}
                          defaultChecked={assignedSet.has(course.wp_course_id)}
                          className="sr-only"
                        />

                        {course.cover_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={course.cover_url}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <BookOpen size={16} className="text-slate-400" />
                          </div>
                        )}

                        <p className="line-clamp-2 min-w-0 flex-1 text-xs font-medium leading-snug text-slate-700">
                          {course.course_name}
                        </p>

                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 transition group-has-[:checked]:border-[#3579F5] group-has-[:checked]:bg-[#3579F5]">
                          <Check size={10} className="hidden text-white group-has-[:checked]:block" strokeWidth={3} />
                        </div>
                      </label>
                    ))}
                  </div>
                </form>
              </article>
            )
          })}
        </section>
      ) : null}
    </div>
  )
}
