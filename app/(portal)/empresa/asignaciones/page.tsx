import { auth } from "@/auth"
import StatusNotice from "@/components/portal/StatusNotice"
import { BookOpen, Package, Users, type LucideIcon } from "lucide-react"
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

function KpiCard({
  label,
  value,
  sub,
  Icon,
  iconCls,
}: {
  label: string
  value: string
  sub?: string
  Icon: LucideIcon
  iconCls: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-950">{value}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
          <Icon size={16} strokeWidth={2} />
        </span>
      </div>
    </div>
  )
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
      <header className="space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">
          RH / Empresa
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Asignación de cursos
        </h1>
      </header>

      {success ? (
        <StatusNotice tone="success" message={successMessages[success] ?? success} />
      ) : null}
      {error ? (
        <StatusNotice tone="error" message={errorMessages[error] ?? error} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Paquete activo"
          value={activePackage?.nombre ?? "Sin paquete"}
          sub="Catálogo disponible"
          Icon={Package}
          iconCls="bg-violet-50 text-violet-600"
        />
        <KpiCard
          label="Cursos disponibles"
          value={String(packageCourses.length)}
          sub="Para asignar a empleados"
          Icon={BookOpen}
          iconCls="bg-teal-50 text-teal-600"
        />
        <KpiCard
          label="Empleados activos"
          value={String(empleados.length)}
          sub="Elegibles para asignación"
          Icon={Users}
          iconCls="bg-blue-50 text-blue-600"
        />
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
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
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
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <form action={assignEmployeeCoursesAction} className="space-y-4">
                  <input type="hidden" name="empleado_id" value={empleado.id} />

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xs font-bold text-violet-700">
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
                        className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {packageCourses.map((course) => (
                      <label
                        key={`${empleado.id}-${course.wp_curso_id}`}
                        className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-white transition hover:border-violet-200 hover:bg-violet-50/30"
                      >
                        {course.portada_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={course.portada_url}
                            alt=""
                            className="h-[75px] w-[130px] shrink-0 rounded-l-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-[60px] w-[107px] shrink-0 items-center justify-center rounded-l-xl bg-violet-50">
                            <span className="text-lg font-bold text-violet-300">
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
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-violet-700"
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
