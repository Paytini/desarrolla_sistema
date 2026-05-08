import { auth } from "@/auth"
import InfoCard from "@/components/portal/InfoCard"
import PageHeader from "@/components/portal/PageHeader"
import StatusNotice from "@/components/portal/StatusNotice"
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

export default async function EmpresaAsignacionesPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) {
    redirect("/login")
  }

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")

  const empresa = await getRhAsignacionesSnapshot(session.user.empresa_id)

  if (!empresa) {
    redirect("/login")
  }

  const activePackage = empresa.paquetes[0]?.paquete
  const packageCourses = (activePackage?.cursos ?? []) as PortalPackageCourseRecord[]
  const empleados = empresa.empleados as AssignmentEmployee[]

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Empresa / RH"
        title="Asignacion de cursos por empleado y area"
        description="Aqui RH asigna cursos del paquete activo segun el area de cada empleado. El bundle define el catalogo disponible; RH decide quien toma que curso."
      />

      {success ? <StatusNotice tone="success" message={successMessages[success] ?? success} /> : null}
      {error ? <StatusNotice tone="error" message={errorMessages[error] ?? error} /> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoCard
          title="Paquete activo"
          value={activePackage?.nombre ?? "Sin paquete activo"}
          description="Solo estos cursos pueden asignarse a los empleados de la empresa."
          accent="violet"
        />
        <InfoCard
          title="Cursos disponibles"
          value={String(packageCourses.length)}
          description="Cursos del paquete actualmente habilitados para asignacion RH."
          accent="teal"
        />
        <InfoCard
          title="Empleados activos"
          value={String(empleados.length)}
          description="Colaboradores elegibles para recibir cursos en su ruta de aprendizaje."
          accent="amber"
        />
      </section>

      {!activePackage ? (
        <StatusNotice
          tone="error"
          message="No hay paquete activo para esta empresa. Solicita a SuperAdmin que asigne un paquete para habilitar asignaciones."
        />
      ) : null}

      {activePackage && packageCourses.length > 0 ? (
        <section className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Asignaciones por empleado</h2>
            <p className="text-sm leading-6 text-slate-600">
              Recomendacion operativa: asigna cursos segun departamento y rol del colaborador para mantener rutas enfocadas.
            </p>
          </div>

          {empleados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No hay empleados activos para asignar cursos.
            </div>
          ) : null}

          {empleados.map((empleado) => {
            const assignedSet = new Set(empleado.cursos.map((course) => course.wp_curso_id))

            return (
              <article
                key={empleado.id}
                className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5"
              >
                <form action={assignEmployeeCoursesAction} className="space-y-4">
                  <input type="hidden" name="empleado_id" value={empleado.id} />

                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">
                        {empleado.nombre} {empleado.apellido}
                      </h3>
                      <p className="text-sm text-slate-600">{empleado.email}</p>
                    </div>
                    <div className="text-sm text-slate-600 md:text-right">
                      <p>
                        <span className="font-medium text-slate-800">Area:</span>{" "}
                        {empleado.departamento || "Sin departamento"}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Puesto:</span>{" "}
                        {empleado.puesto || "Sin puesto"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {packageCourses.map((course) => (
                      <label
                        key={`${empleado.id}-${course.wp_curso_id}`}
                        className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3"
                      >
                        <input
                          type="checkbox"
                          name="course_ids"
                          value={course.wp_curso_id}
                          defaultChecked={assignedSet.has(course.wp_curso_id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-700"
                        />
                        <span className="text-sm text-slate-700">
                          {course.nombre_curso}
                          <span className="block text-xs text-slate-500">
                            ID: {course.wp_curso_id}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
                  >
                    Guardar asignaciones
                  </button>
                </form>
              </article>
            )
          })}
        </section>
      ) : null}
    </div>
  )
}
