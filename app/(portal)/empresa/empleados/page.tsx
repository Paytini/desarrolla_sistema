import DeleteEmployeeButton from "@/components/portal/DeleteEmployeeButton"
import InfoCard from "@/components/portal/InfoCard"
import PageHeader from "@/components/portal/PageHeader"
import StatusNotice from "@/components/portal/StatusNotice"
import {
  matchesEmployeeFilters,
  normalizeEmployeeFilterStatus,
  normalizeEmployeeSearchQuery,
} from "@/lib/company-employees"
import { getRhEmpleadosSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import {
  createEmployeeAction,
  deleteEmployeeAction,
  importEmployeesCsvAction,
  toggleEmployeeStatusAction,
  triggerCompanyLearningSyncAction,
} from "./actions"

const successMessages: Record<string, string> = {
  empleado_creado: "El empleado se creo correctamente y ya puede entrar al portal con sus credenciales.",
  empleado_creado_sync:
    "El empleado se creo y tambien quedo provisionado en WordPress/Tutor LMS. El siguiente paso es asignarle cursos desde RH > Asignaciones.",
  empleado_suspendido: "El empleado fue suspendido y su acceso al portal quedo inhabilitado.",
  empleado_activado: "El empleado fue reactivado correctamente.",
  empleado_eliminado: "El empleado se elimino del portal y su cupo fue liberado.",
  sync_background_started:
    "La sincronizacion de aprendizaje se envio a segundo plano para esta empresa. Puedes seguir usando el portal mientras se actualizan cursos, progreso y constancias.",
  sync_background_already_running:
    "Ya existe una sincronizacion en proceso para esta empresa. Dejamos correr la actual para evitar duplicados.",
}

const errorMessages: Record<string, string> = {
  datos: "Faltan datos obligatorios para registrar al empleado.",
  email: "Ese correo ya existe como empleado o usuario del portal.",
  cupos: "La empresa ya alcanzo el limite de empleados contratados.",
  empresa: "No se encontro la empresa asociada a tu cuenta.",
  empleado: "No se encontro el empleado solicitado.",
  bridge_sync: "El empleado se creo en el portal, pero no fue posible sincronizarlo con WordPress. Revisa la configuracion del puente.",
  asignacion_manual:
    "El empleado se creo, pero aun no tiene cursos asignados. Asignalo desde RH > Asignaciones segun su area.",
  csv_file: "Selecciona un archivo CSV valido para importar empleados.",
  csv_empty: "El archivo CSV no contiene filas suficientes para importar empleados.",
  csv_limit: "El archivo CSV excede el limite permitido de 200 filas por carga.",
  csv_password_required:
    "Define un password temporal por defecto o incluye la columna password en el CSV para que RH pueda entregar credenciales conocidas.",
  bridge_delete:
    "No fue posible eliminar al empleado en WordPress/Tutor LMS. El registro del portal se mantuvo intacto para evitar inconsistencias.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getSuccessMessage(
  success: string | undefined,
  params: Record<string, string | string[] | undefined> | undefined
) {
  if (!success) {
    return null
  }

  if (success === "csv_imported") {
    const created = readSearchParam(params, "created") ?? "0"
    const synced = readSearchParam(params, "synced") ?? "0"
    const warnings = readSearchParam(params, "warnings") ?? "0"
    const skipped = readSearchParam(params, "skipped") ?? "0"

    return `Importacion completada. Creados: ${created}. Sincronizados con WordPress/Tutor: ${synced}. Con advertencia de bridge: ${warnings}. Omitidos: ${skipped}.`
  }

  return successMessages[success] ?? success
}

function buildEmployeeListPath(query: string, status: string) {
  const searchParams = new URLSearchParams()

  if (query) {
    searchParams.set("q", query)
  }

  if (status !== "all") {
    searchParams.set("status", status)
  }

  const serialized = searchParams.toString()
  return serialized ? `/empresa/empleados?${serialized}` : "/empresa/empleados"
}

export default async function EmpresaEmpleadosPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) {
    redirect("/login")
  }

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")
  const searchQuery = (readSearchParam(params, "q") ?? "").trim()
  const query = normalizeEmployeeSearchQuery(searchQuery)
  const status = normalizeEmployeeFilterStatus(readSearchParam(params, "status"))

  const empresa = await getRhEmpleadosSnapshot(session.user.empresa_id)

  if (!empresa) {
    redirect("/login")
  }

  const empleadosActivos = empresa.empleados.filter((empleado) => empleado.activo).length
  const empleadosInactivos = empresa.empleados.length - empleadosActivos
  const cuposDisponibles = Math.max(empresa.asientos_contratados - empleadosActivos, 0)
  const paqueteActivo = empresa.paquetes[0]?.paquete?.nombre ?? "Sin paquete activo"
  const employeesWithAccessIssues = empresa.empleados.filter((empleado) =>
    empleado.cursos.some((curso) => curso.acceso_estado === "ERROR")
  ).length
  const filteredEmployees = empresa.empleados.filter((empleado) =>
    matchesEmployeeFilters(empleado, {
      query,
      status,
    })
  )
  const currentListPath = buildEmployeeListPath(searchQuery, status)
  const exportHref = `/api/empresa/empleados/export${
    currentListPath === "/empresa/empleados" ? "" : currentListPath.replace("/empresa/empleados", "")
  }`

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Empresa / RH"
        title="Gestion de empleados y cupos"
        description="Aqui el area RH ya puede registrar empleados reales, controlar cupos y activar o suspender accesos sin depender del equipo de Desarrolla360."
      />

      {success ? <StatusNotice tone="success" message={getSuccessMessage(success, params) ?? success} /> : null}
      {error ? <StatusNotice tone="error" message={errorMessages[error] ?? error} /> : null}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Sincronizacion academica</h2>
            <p className="text-sm leading-6 text-slate-600">
              Actualiza cursos, progreso y constancias de tus empleados activos en segundo plano, sin frenar la navegacion del portal.
            </p>
          </div>

          <form action={triggerCompanyLearningSyncAction}>
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Actualizar ahora
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <InfoCard
          title="Paquete activo"
          value={paqueteActivo}
          description="Paquete corporativo actual vinculado a la empresa."
          accent="violet"
        />
        <InfoCard
          title="Empleados activos"
          value={String(empleadosActivos)}
          description="Colaboradores con acceso vigente al portal."
          accent="teal"
        />
        <InfoCard
          title="Cupos disponibles"
          value={String(cuposDisponibles)}
          description="Lugares restantes antes de alcanzar el limite contratado."
          accent="amber"
        />
        <InfoCard
          title="Suspendidos"
          value={String(empleadosInactivos)}
          description="Empleados dados de baja logica dentro del portal."
          accent="slate"
        />
        <InfoCard
          title="Con alertas de acceso"
          value={String(employeesWithAccessIssues)}
          description="Empleados cuyos cursos reportan error de acceso academico."
          accent="amber"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
        <article className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Alta de empleado</h2>
            <p className="text-sm leading-6 text-slate-600">
              Cada alta crea el empleado y su usuario del portal. Es ideal para casos puntuales o cuando RH solo necesita registrar a una persona a la vez.
            </p>
          </div>

          <form action={createEmployeeAction} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Nombre</span>
                <input
                  name="nombre"
                  required
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-violet-600"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Apellido</span>
                <input
                  name="apellido"
                  required
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-violet-600"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Correo electronico</span>
                <input
                  name="email"
                  type="email"
                  required
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-violet-600"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Password temporal</span>
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-violet-600"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Departamento</span>
                <input
                  name="departamento"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-violet-600"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Puesto</span>
                <input
                  name="puesto"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-violet-600"
                />
              </label>
            </div>

            <button
              type="submit"
              className="inline-flex w-fit items-center rounded-full bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-800"
            >
              Crear empleado
            </button>
          </form>
        </article>

        <article className="min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Carga masiva por CSV</h2>
            <p className="text-sm leading-6 text-slate-600">
              Recomendado cuando necesitas registrar múltiples empleados simultáneamente. El portal valida el formato CSV y verifica los datos antes de crear usuarios, garantizando confiabilidad en importaciones masivas.
            </p>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {[
              "nombre",
              "apellido",
              "email",
              "departamento",
              "puesto",
              "password",
            ].map((column) => (
              <span
                key={column}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {column}
              </span>
            ))}
          </div>

          <form
            action={importEmployeesCsvAction}
            className="grid gap-4"
            data-loading-message="Importando empleados..."
            data-loading-detail="Estamos leyendo el archivo CSV, creando usuarios y sincronizando accesos. Este proceso puede tardar un poco."
          >
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Archivo CSV</span>
              <input
                name="archivo_csv"
                type="file"
                accept=".csv,text/csv"
                required
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Password temporal por defecto</span>
              <input
                name="password_csv"
                type="text"
                minLength={8}
                placeholder="Recomendado si tu CSV no incluye columna password"
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-violet-600"
              />
            </label>

            <div className="max-w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Ejemplo visual tipo Excel</p>
                  <p className="text-xs leading-5 text-slate-500">
                    Asi debe verse la informacion dentro del archivo CSV antes de importarla.
                  </p>
                </div>

                <a
                  href="/api/templates/empleados-csv"
                  className="inline-flex self-start items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  Descargar plantilla CSV
                </a>
              </div>

              <div className="mt-4 max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="min-w-[720px] text-sm">
                  <thead className="bg-slate-100 text-left text-slate-700">
                    <tr>
                      {[
                        "nombre",
                        "apellido",
                        "email",
                        "departamento",
                        "puesto",
                        "password",
                      ].map((column) => (
                        <th key={column} className="whitespace-nowrap px-4 py-3 font-semibold">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    <tr>
                      <td className="whitespace-nowrap px-4 py-3">Ana</td>
                      <td className="whitespace-nowrap px-4 py-3">Perez</td>
                      <td className="whitespace-nowrap px-4 py-3">ana@empresa.com</td>
                      <td className="whitespace-nowrap px-4 py-3">Operaciones</td>
                      <td className="whitespace-nowrap px-4 py-3">Supervisor</td>
                      <td className="whitespace-nowrap px-4 py-3">Temporal123</td>
                    </tr>
                    <tr>
                      <td className="whitespace-nowrap px-4 py-3">Luis</td>
                      <td className="whitespace-nowrap px-4 py-3">Lopez</td>
                      <td className="whitespace-nowrap px-4 py-3">luis@empresa.com</td>
                      <td className="whitespace-nowrap px-4 py-3">Seguridad</td>
                      <td className="whitespace-nowrap px-4 py-3">Supervisor</td>
                      <td className="whitespace-nowrap px-4 py-3">Temporal123</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                Si el CSV no incluye la columna <span className="font-semibold">password</span>, captura arriba un password temporal por defecto para todos los empleados de esa carga.
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex w-fit items-center rounded-full bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-800"
            >
              Importar empleados
            </button>
          </form>
        </article>
      </section>

      <section className="grid gap-6">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950">Plantilla actual</h2>
              <p className="text-sm leading-6 text-slate-600">
                Estado actual de los empleados dentro del portal y consumo de lugares contratados.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={exportHref}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                Exportar CSV
              </a>
            </div>
          </div>

          <form className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1.5fr)_220px_auto]">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Buscar empleado</span>
                <input
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Nombre, apellido, correo, departamento o puesto"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-violet-600"
                />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Estado</span>
              <select
                name="status"
                defaultValue={status}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-violet-600"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Suspendidos</option>
              </select>
            </label>

            <div className="flex flex-wrap items-end gap-2">
              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Filtrar
              </button>
              {(searchQuery || status !== "all") ? (
                <a
                  href="/empresa/empleados"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Limpiar
                </a>
              ) : null}
            </div>
          </form>

          <div className="mb-4 text-sm text-slate-600">
            Mostrando {filteredEmployees.length} de {empresa.empleados.length} empleados registrados.
          </div>

          <div className="space-y-4">
            {empresa.empleados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Aun no hay empleados registrados para esta empresa.
              </div>
            ) : null}

            {empresa.empleados.length > 0 && filteredEmployees.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No encontramos empleados que coincidan con ese filtro.
              </div>
            ) : null}

            {filteredEmployees.map((empleado) => (
              <div key={empleado.id} className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                {(() => {
                  const activeCourseCount = empleado.cursos.filter((curso) => curso.acceso_estado === "ACTIVE").length
                  const pendingCourseCount = empleado.cursos.filter((curso) => curso.acceso_estado === "PENDING").length
                  const errorCourseCount = empleado.cursos.filter((curso) => curso.acceso_estado === "ERROR").length

                  return (
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
                    </div>

                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p>
                        <span className="font-medium text-slate-800">Correo:</span> {empleado.email}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Alta:</span>{" "}
                        {formatDate(empleado.created_at)}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Departamento:</span>{" "}
                        {empleado.departamento || "Sin capturar"}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Puesto:</span>{" "}
                        {empleado.puesto || "Sin capturar"}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">WP user ID:</span>{" "}
                        {empleado.wp_user_id ?? "Pendiente de sincronizar"}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Acceso cursos:</span>{" "}
                        {activeCourseCount} activos, {pendingCourseCount} pendientes, {errorCourseCount} con error
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <form action={toggleEmployeeStatusAction}>
                      <input type="hidden" name="empleado_id" value={empleado.id} />
                      <input type="hidden" name="return_to" value={currentListPath} />
                      <button
                        type="submit"
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          empleado.activo
                            ? "bg-slate-900 text-white hover:bg-slate-700"
                            : "bg-violet-700 text-white hover:bg-violet-800"
                        }`}
                      >
                        {empleado.activo ? "Suspender" : "Reactivar"}
                      </button>
                    </form>

                    <DeleteEmployeeButton
                      action={deleteEmployeeAction}
                      empleadoId={empleado.id}
                      employeeName={`${empleado.nombre} ${empleado.apellido}`.trim()}
                      returnTo={currentListPath}
                    />
                  </div>
                </div>
                  )
                })()}
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
