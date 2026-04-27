import { redirect } from "next/navigation"
import InfoCard from "@/components/portal/InfoCard"
import PageHeader from "@/components/portal/PageHeader"
import StatusNotice from "@/components/portal/StatusNotice"
import { formatDate, formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import {
  deleteEmployeeAsSuperAdminAction,
  purgeExpiredSessionsAction,
  revokeSingleSessionAction,
  revokeUserSessionsAction,
  toggleRhUserStatusAction,
} from "./actions"

const successMessages: Record<string, string> = {
  rh_suspendido: "El usuario RH fue suspendido correctamente.",
  rh_activado: "El usuario RH fue reactivado correctamente.",
  sesiones_revocadas: "Las sesiones registradas del usuario fueron revocadas.",
  sesion_revocada: "La sesion seleccionada fue revocada.",
  sesiones_limpiadas: "Las sesiones expiradas fueron limpiadas correctamente.",
  empleado_eliminado: "El empleado se elimino del portal desde el panel central de accesos.",
}

const errorMessages: Record<string, string> = {
  usuario: "No fue posible actualizar el usuario solicitado.",
  sesion: "No fue posible revocar la sesion solicitada.",
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

  const [rhUsers, employeeUsers, employees, trackedSessions] = await Promise.all([
    prisma.usuario.findMany({
      where: { rol: "RH" },
      orderBy: [{ activo: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
        ultimo_acceso: true,
        created_at: true,
        empresa: {
          select: {
            id: true,
            nombre: true,
            activo: true,
            asientos_contratados: true,
            asientos_usados: true,
          },
        },
        _count: {
          select: { sesiones: true },
        },
      },
    }),
    prisma.usuario.findMany({
      where: { rol: "EMPLEADO" },
      select: {
        id: true,
        email: true,
        activo: true,
        ultimo_acceso: true,
      },
    }),
    prisma.empleado.findMany({
      orderBy: [{ activo: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        activo: true,
        wp_user_id: true,
        created_at: true,
        empresa: {
          select: {
            nombre: true,
            activo: true,
          },
        },
      },
      take: 18,
    }),
    prisma.sesionPortal.findMany({
      orderBy: { created_at: "desc" },
      take: 12,
      select: {
        id: true,
        ip_address: true,
        created_at: true,
        expira_en: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
            empresa: {
              select: { nombre: true },
            },
          },
        },
      },
    }),
  ])

  const employeeUserByEmail = new Map(
    employeeUsers.map((user) => [user.email.toLowerCase(), user])
  )

  const rhActivos = rhUsers.filter((user) => user.activo).length
  const empleadosActivos = employees.filter((empleado) => empleado.activo).length
  const usuariosSuspendidos =
    rhUsers.filter((user) => !user.activo).length +
    employeeUsers.filter((user) => !user.activo).length
  const sesionesActivas = trackedSessions.filter((trackedSession) => trackedSession.expira_en > new Date()).length

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SuperAdmin"
        title="Control de accesos y permisos"
        description="Zona para administrar usuarios RH, empleados activos, revocacion de sesiones y suspensiones por empresa."
      />

      {success ? <StatusNotice tone="success" message={successMessages[success] ?? success} /> : null}
      {error ? <StatusNotice tone="error" message={errorMessages[error] ?? error} /> : null}

      <section className="grid gap-4 lg:grid-cols-4">
        <InfoCard
          title="Usuarios RH activos"
          value={String(rhActivos)}
          description="Responsables de empresa que hoy pueden administrar su tenant."
          accent="teal"
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
          accent="violet"
        />
        <InfoCard
          title="Sesiones rastreadas"
          value={String(sesionesActivas)}
          description="Sesiones locales registradas actualmente dentro del portal."
          accent="slate"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_1.32fr]">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Usuarios RH por empresa</h2>
            <p className="text-sm leading-6 text-slate-600">
              Aqui puedes pausar accesos RH, revisar ultima actividad y revocar sesiones registradas de forma centralizada.
            </p>
          </div>

          <div className="space-y-4">
            {rhUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Aun no hay usuarios RH registrados.
              </div>
            ) : null}

            {rhUsers.map((user) => (
              <div
                key={user.id}
                className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-slate-950">{user.nombre}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.activo
                            ? "bg-teal-100 text-teal-900"
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

                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
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
                        <span className="font-medium text-slate-800">Sesiones registradas:</span>{" "}
                        {user._count.sesiones}
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

                  <div className="flex flex-wrap gap-2">
                    <form action={toggleRhUserStatusAction}>
                      <input type="hidden" name="user_id" value={user.id} />
                      <button
                        type="submit"
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          user.activo
                            ? "bg-slate-900 text-white hover:bg-slate-700"
                            : "bg-violet-700 text-white hover:bg-violet-800"
                        }`}
                      >
                        {user.activo ? "Suspender RH" : "Reactivar RH"}
                      </button>
                    </form>

                    <form action={revokeUserSessionsAction}>
                      <input type="hidden" name="user_id" value={user.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                      >
                        Revocar sesiones
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <div className="space-y-6">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-950">Sesiones del portal</h2>
                <p className="text-sm leading-6 text-slate-600">
                  Revoca sesiones registradas o limpia las expiradas para mantener higiene operativa.
                </p>
              </div>

              <form action={purgeExpiredSessionsAction}>
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Limpiar expiradas
                </button>
              </form>
            </div>

            <div className="space-y-4">
              {trackedSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Aun no hay sesiones rastreadas en la tabla local. Con la estrategia JWT actual, esta vista sirve como base para trazabilidad adicional.
                </div>
              ) : null}

              {trackedSessions.map((trackedSession) => (
                <div
                  key={trackedSession.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-semibold text-slate-950">
                          {trackedSession.usuario.nombre}
                        </h3>
                        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {trackedSession.usuario.rol}
                        </span>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                        <p>
                          <span className="font-medium text-slate-800">Correo:</span>{" "}
                          {trackedSession.usuario.email}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Empresa:</span>{" "}
                          {trackedSession.usuario.empresa?.nombre ?? "Sin empresa"}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Creada:</span>{" "}
                          {formatDateTime(trackedSession.created_at)}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Expira:</span>{" "}
                          {formatDateTime(trackedSession.expira_en)}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">IP:</span>{" "}
                          {trackedSession.ip_address ?? "Sin registro"}
                        </p>
                      </div>
                    </div>

                    <form action={revokeSingleSessionAction}>
                      <input type="hidden" name="session_id" value={trackedSession.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        Revocar sesion
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 space-y-1">
              <h2 className="text-lg font-semibold text-slate-950">Empleados del portal</h2>
              <p className="text-sm leading-6 text-slate-600">
                Vista central para detectar empleados suspendidos, revisarlos por empresa y eliminarlos cuando haga falta liberar acceso.
              </p>
            </div>

            <div className="space-y-4">
              {employees.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Aun no hay empleados registrados.
                </div>
              ) : null}

              {employees.map((empleado) => {
                const employeeUser = employeeUserByEmail.get(empleado.email.toLowerCase())

                return (
                  <div
                    key={empleado.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-base font-semibold text-slate-950">
                            {empleado.nombre} {empleado.apellido}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              empleado.activo
                                ? "bg-teal-100 text-teal-900"
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

                        <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
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
        </div>
      </section>
    </div>
  )
}
