import { redirect } from "next/navigation"
import InfoCard from "@/components/portal/InfoCard"
import PageHeader from "@/components/portal/PageHeader"
import StatusNotice from "@/components/portal/StatusNotice"
import { getSuperadminAccesosSnapshot } from "@/lib/dashboard-cache"
import { formatDate, formatDateTime } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import {
  deleteEmployeeAsSuperAdminAction,
  toggleRhUserStatusAction,
} from "./actions"

const successMessages: Record<string, string> = {
  rh_suspendido: "El usuario RH fue suspendido correctamente.",
  rh_activado: "El usuario RH fue reactivado correctamente.",
  empleado_eliminado: "El empleado se elimino del portal desde el panel central de accesos.",
}

const errorMessages: Record<string, string> = {
  usuario: "No fue posible actualizar el usuario solicitado.",
  empleado: "No fue posible eliminar el empleado solicitado.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SuperAdminAccesosPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")

  const { rhUsers, employeeUsers, employees } = await getSuperadminAccesosSnapshot()

  const employeeUserByEmail = new Map(
    employeeUsers.map((user) => [user.email.toLowerCase(), user])
  )

  const rhActivos = rhUsers.filter((user) => user.activo).length
  const empleadosActivos = employees.filter((empleado) => empleado.activo).length
  const usuariosSuspendidos =
    rhUsers.filter((user) => !user.activo).length +
    employeeUsers.filter((user) => !user.activo).length

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SuperAdmin"
        title="Control de accesos y permisos"
        description="Zona para administrar usuarios RH, empleados activos y suspensiones por empresa."
      />

      {success ? <StatusNotice tone="success" message={successMessages[success] ?? success} /> : null}
      {error ? <StatusNotice tone="error" message={errorMessages[error] ?? error} /> : null}

      <section className="grid gap-4 lg:grid-cols-4">
        <InfoCard
          title="Usuarios RH activos"
          value={String(rhActivos)}
          description="Responsables de empresa que hoy pueden administrar su tenant."
          accent="orange"
        />
        <InfoCard
          title="Empleados activos"
          value={String(empleadosActivos)}
          description="Trabajadores con acceso vigente dentro del portal."
          accent="amber"
        />
        <InfoCard
          title="Usuarios suspendidos"
          value={String(usuariosSuspendidos)}
          description="Cuentas RH o empleado que hoy estan inhabilitadas."
          accent="slate"
        />
        <InfoCard
          title="Usuarios empleado"
          value={String(employeeUsers.length)}
          description="Cuentas de empleado registradas para ingreso al portal."
          accent="slate"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950">Usuarios RH por empresa</h2>
              <p className="text-sm leading-6 text-slate-600">
                Pausa o reactiva accesos RH sin recorrer una lista interminable.
              </p>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {rhUsers.length} registros
            </span>
          </div>

          <div className="max-h-[42rem] space-y-3 overflow-y-auto pr-2">
            {rhUsers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Aun no hay usuarios RH registrados.
              </div>
            ) : null}

            {rhUsers.map((user) => (
              <div
                key={user.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-slate-950">{user.nombre}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.activo
                            ? "bg-[#fff5ed] text-teal-900"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {user.activo ? "Activo" : "Suspendido"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.empresa?.activo
                            ? "bg-amber-100 text-amber-900"
                            : "bg-rose-100 text-rose-900"
                        }`}
                      >
                        {user.empresa?.activo ? "Empresa activa" : "Empresa suspendida"}
                      </span>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-600 2xl:grid-cols-2">
                      <p>
                        <span className="font-medium text-slate-800">Empresa:</span>{" "}
                        {user.empresa?.nombre ?? "Sin empresa"}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Correo:</span> {user.email}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Ultimo acceso:</span>{" "}
                        {formatDateTime(user.ultimo_acceso)}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Cupos usados:</span>{" "}
                        {user.empresa ? `${user.empresa.asientos_usados}/${user.empresa.asientos_contratados}` : "N/A"}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Alta:</span>{" "}
                        {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>

                  <form action={toggleRhUserStatusAction}>
                    <input type="hidden" name="user_id" value={user.id} />
                    <button
                      type="submit"
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        user.activo
                          ? "bg-[#1a1a1a] text-white hover:bg-slate-700"
                          : "bg-violet-700 text-white hover:bg-violet-800"
                      }`}
                    >
                      {user.activo ? "Suspender RH" : "Reactivar RH"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950">Empleados del portal</h2>
              <p className="text-sm leading-6 text-slate-600">
                Revisa empleados por empresa y elimina accesos cuando haga falta liberar una cuenta.
              </p>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Ultimos {employees.length}
            </span>
          </div>

          <div className="max-h-[42rem] space-y-3 overflow-y-auto pr-2">
            {employees.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Aun no hay empleados registrados.
              </div>
            ) : null}

            {employees.map((empleado) => {
              const employeeUser = employeeUserByEmail.get(empleado.email.toLowerCase())

              return (
                <div
                  key={empleado.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-semibold text-slate-950">
                          {empleado.nombre} {empleado.apellido}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            empleado.activo
                              ? "bg-[#fff5ed] text-teal-900"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {empleado.activo ? "Activo" : "Suspendido"}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            empleado.empresa.activo
                              ? "bg-amber-100 text-amber-900"
                              : "bg-rose-100 text-rose-900"
                          }`}
                        >
                          {empleado.empresa.activo ? "Empresa activa" : "Empresa suspendida"}
                        </span>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600 2xl:grid-cols-2">
                        <p>
                          <span className="font-medium text-slate-800">Empresa:</span>{" "}
                          {empleado.empresa.nombre}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Correo:</span> {empleado.email}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Ultimo acceso:</span>{" "}
                          {formatDateTime(employeeUser?.ultimo_acceso)}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Usuario portal:</span>{" "}
                          {employeeUser ? (employeeUser.activo ? "Activo" : "Suspendido") : "No encontrado"}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">WP user ID:</span>{" "}
                          {empleado.wp_user_id ?? "Sin sincronizar"}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Alta:</span>{" "}
                          {formatDate(empleado.created_at)}
                        </p>
                      </div>
                    </div>

                    <form action={deleteEmployeeAsSuperAdminAction}>
                      <input type="hidden" name="empleado_id" value={empleado.id} />
                      <button
                        type="submit"
                        className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                      >
                        Eliminar empleado
                      </button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </section>
    </div>
  )
}
