import { auth } from "@/auth"
import KpiCard from "@/components/portal/KpiCard"
import PageHeader from "@/components/portal/PageHeader"
import StatusNotice from "@/components/portal/StatusNotice"
import { BookOpen, Package, Users } from "lucide-react"
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
  const empleados = empresa.empleados as AssignmentEmployee[]

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="RH / Empresa" title="Asignación de cursos" description="Asigna cursos del paquete activo a cada colaborador" />

      {success ? (
        <StatusNotice tone="success" message={successMessages[success] ?? success} />
      ) : null}
      {error ? (
        <StatusNotice tone="error" message={errorMessages[error] ?? error} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Paquete activo" value={activePackage?.nombre ?? "Sin paquete"} sub="Catálogo disponible" icon={Package} borderColor="amber" />
        <KpiCard label="Cursos disponibles" value={String(packageCourses.length)} sub="Para asignar a empleados" icon={BookOpen} borderColor="orange" />
        <KpiCard label="Empleados activos" value={String(empleados.length)} sub="Elegibles para asignación" icon={Users} borderColor="charcoal" />
      </div>

      {!activePackage ? (
        <StatusNotice
          tone="error"
          message="No hay paquete activo para esta empresa. Solicita a SuperAdmin que asigne un paquete para habilitar asignaciones."
        />
      ) : null}

      {activePackage && packageCourses.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Asignaciones por empleado</h2>
            <p className="text-xs text-slate-400">
              Selecciona los cursos para cada colaborador y guarda.
            </p>
          </div>

          {empleados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#f0f0f0] bg-white px-4 py-8 text-center text-sm text-slate-500">
              No hay empleados activos para asignar cursos.
            </div>
          ) : null}

          {empleados.map((empleado) => {
            const assignedSet = new Set(empleado.cursos.map((c) => c.wp_curso_id))
            const assignedCount = empleado.cursos.length
            const initials = getInitials(`${empleado.nombre} ${empleado.apellido}`)

            return (
              <article
                key={empleado.id}
                className="rounded-xl border border-[#f0f0f0] bg-white p-5"
              >
                <form action={assignEmployeeCoursesAction} className="space-y-4">
                  <input type="hidden" name="empleado_id" value={empleado.id} />

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fff2eb] text-xs font-bold text-[#F5853F]">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-950">
                          {empleado.nombre} {empleado.apellido}
                        </p>
                        <p className="text-xs text-slate-500">
                          {empleado.email}
                          {empleado.departamento ? ` · ${empleado.departamento}` : ""}
                          {empleado.puesto ? ` · ${empleado.puesto}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">
                        {assignedCount}/{packageCourses.length} asignados
                      </span>
                      <button
                        type="submit"
                        className="rounded-full bg-[#F5853F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#D96B20]"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {packageCourses.map((course) => (
                      <label
                        key={`${empleado.id}-${course.wp_curso_id}`}
                        className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#f0f0f0] bg-white transition hover:border-[#F5853F]/30 hover:bg-[#fff2eb]/30"
                      >
                        {course.portada_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={course.portada_url}
                            alt=""
                            className="h-[75px] w-[130px] shrink-0 rounded-l-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-[60px] w-[107px] shrink-0 items-center justify-center rounded-l-xl bg-[#fff2eb]">
                            <span className="text-lg font-bold text-[#F5853F]/30">
                              {course.nombre_curso.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-1 items-start gap-2 py-2 pr-2.5">
                          <input
                            type="checkbox"
                            name="course_ids"
                            value={course.wp_curso_id}
                            defaultChecked={assignedSet.has(course.wp_curso_id)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#F5853F]"
                          />
                          <span className="text-sm text-slate-700">
                            {course.nombre_curso}
                            <span className="block text-xs text-slate-400">ID: {course.wp_curso_id}</span>
                          </span>
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
