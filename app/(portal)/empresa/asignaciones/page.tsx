import { auth } from "@/auth"
import KpiCard from "@/components/shared/KpiCard"
import { PageHeader } from "@/components/shared/PageHeader"
import StatusNotice from "@/components/shared/StatusNotice"
import { BookOpen, Check, Package, Users } from "lucide-react"
import { SearchInput } from "@/components/shared/SearchInput"
import { getRhAsignacionesSnapshot } from "@/lib/dashboard-cache"
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
  nombre: string
  apellido: string
  email: string
  departamento: string | null
  puesto: string | null
  cursos: Array<{ wp_curso_id: number }>
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export default async function EmpresaAsignacionesPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) redirect("/login")

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")

  const empresa = await getRhAsignacionesSnapshot(session.user.empresa_id)
  if (!empresa) redirect("/login")

  const activePackage = empresa.paquetes[0]?.paquete
  const packageCourses = (activePackage?.cursos ?? []) as PortalPackageCourseRecord[]
  const allEmpleados = empresa.empleados as AssignmentEmployee[]

  const searchQuery = (readSearchParam(params, "q") ?? "").trim().toLowerCase()
  const empleados = searchQuery
    ? allEmpleados.filter((e) =>
        `${e.nombre} ${e.apellido}`.toLowerCase().includes(searchQuery) ||
        e.email.toLowerCase().includes(searchQuery)
      )
    : allEmpleados

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asignación de cursos"
        description="Asigna cursos del paquete activo a cada colaborador"
        accentColor="#F5853F"
        breadcrumbs={[{ label: "Empresa", href: "/empresa/inicio" }, { label: "Asignaciones" }]}
      />

      {success ? (
        <StatusNotice tone="success" message={successMessages[success] ?? success} />
      ) : null}
      {error ? (
        <StatusNotice tone="error" message={errorMessages[error] ?? error} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Paquete activo" value={activePackage?.nombre ?? "Sin paquete"} sub="Catálogo disponible" icon={Package} borderColor="amber" />
        <KpiCard label="Cursos disponibles" value={String(packageCourses.length)} sub="Para asignar a empleados" icon={BookOpen} borderColor="orange" />
        <KpiCard label="Empleados activos" value={String(allEmpleados.length)} sub="Elegibles para asignación" icon={Users} borderColor="charcoal" />
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
                  {empleados.length} resultado{empleados.length !== 1 ? "s" : ""}
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

          {empleados.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
              {searchQuery ? `Sin resultados para "${searchQuery}".` : "No hay empleados activos para asignar cursos."}
            </div>
          ) : null}

          {empleados.map((empleado) => {
            const assignedSet = new Set(empleado.cursos.map((c) => c.wp_curso_id))
            const assignedCount = empleado.cursos.length
            const initials = getInitials(`${empleado.nombre} ${empleado.apellido}`)

            return (
              <article
                key={empleado.id}
                className="overflow-hidden rounded-lg bg-white"
              >
                <form action={assignEmployeeCoursesAction}>
                  <input type="hidden" name="empleado_id" value={empleado.id} />

                  <div className="flex items-center justify-between gap-4 border-b border-[#f5f5f5] px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fff2eb] text-xs font-bold text-[#F5853F]">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {empleado.nombre} {empleado.apellido}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {empleado.email}
                          {empleado.departamento ? ` · ${empleado.departamento}` : ""}
                          {empleado.puesto ? ` · ${empleado.puesto}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                        {assignedCount}/{packageCourses.length} cursos
                      </span>
                      <button
                        type="submit"
                        className="rounded-full bg-[#F5853F] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#D96B20]"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
                    {packageCourses.map((course) => (
                      <label
                        key={`${empleado.id}-${course.wp_curso_id}`}
                        className="group flex cursor-pointer items-center gap-3 rounded-xl border border-[#efefef] p-2.5 transition hover:border-[#F5853F]/30 hover:bg-[#fff8f5] has-[:checked]:border-[#F5853F]/40 has-[:checked]:bg-[#fff8f5]"
                      >
                        <input
                          type="checkbox"
                          name="course_ids"
                          value={course.wp_curso_id}
                          defaultChecked={assignedSet.has(course.wp_curso_id)}
                          className="sr-only"
                        />

                        {course.portada_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={course.portada_url}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <BookOpen size={16} className="text-slate-400" />
                          </div>
                        )}

                        <p className="line-clamp-2 min-w-0 flex-1 text-xs font-medium leading-snug text-slate-700">
                          {course.nombre_curso}
                        </p>

                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 transition group-has-[:checked]:border-[#F5853F] group-has-[:checked]:bg-[#F5853F]">
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
