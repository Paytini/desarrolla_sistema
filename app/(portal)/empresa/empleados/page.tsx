import CnoSelect from "@/components/empresa/CnoSelect"
import CurpInfoButton from "@/components/empresa/CurpInfoButton"
import DeleteEmployeeButton from "@/components/empresa/DeleteEmployeeButton"
import EmployeeOnboardingTabs from "@/components/empresa/EmployeeOnboardingTabs"
import KpiCard from "@/components/shared/KpiCard"
import { PageHeader } from "@/components/shared/PageHeader"
import StatusBadge from "@/components/shared/StatusBadge"
import StatusNotice from "@/components/shared/StatusNotice"
import { AlertCircle, Package, ShieldCheck, Users, UserX } from "lucide-react"
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
  if (!success) return null
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
  if (query) searchParams.set("q", query)
  if (status !== "all") searchParams.set("status", status)
  const serialized = searchParams.toString()
  return serialized ? `/empresa/empleados?${serialized}` : "/empresa/empleados"
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

function ManualEmployeeForm() {
  return (
    <form action={createEmployeeAction} className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Apellido paterno</span>
          <input
            name="apellido"
            required
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#F5853F]"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Apellido materno</span>
          <input
            name="apellido_materno"
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#F5853F]"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Nombre(s)</span>
          <input
            name="nombre"
            required
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#F5853F]"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Correo electrónico</span>
          <input
            name="email"
            type="email"
            required
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#F5853F]"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Password temporal</span>
          <input
            name="password"
            type="password"
            minLength={8}
            required
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#F5853F]"
          />
        </label>
      </div>

      <div className="rounded-xl border border-[#f0f0f0] bg-[#f8fafc] p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Datos para constancia DC-3</p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              CURP
              <CurpInfoButton />
            </span>
            <input
              name="curp"
              maxLength={18}
              placeholder="18 caracteres"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 uppercase outline-none transition focus:border-[#F5853F]"
            />
          </label>
          <CnoSelect />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Departamento</span>
          <input
            name="departamento"
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#F5853F]"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Puesto</span>
          <input
            name="puesto"
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#F5853F]"
          />
        </label>
      </div>

      <button
        type="submit"
        className="inline-flex w-fit items-center rounded-full bg-[#F5853F] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#D96B20]"
      >
        Crear empleado
      </button>
    </form>
  )
}

function CsvEmployeeImportForm() {
  const columns = [
    { key: "nombre", label: "nombre", required: true },
    { key: "apellido", label: "apellido", required: true },
    { key: "email", label: "email", required: true },
    { key: "curp", label: "curp", required: true },
    { key: "departamento", label: "departamento", required: true },
    { key: "puesto", label: "puesto", required: true },
    { key: "ocupacion_especifica_clave", label: "ocupacion_especifica_clave", required: true },
    { key: "ocupacion_especifica", label: "ocupacion_especifica", required: true },
    { key: "password", label: "password", required: false },
  ]
  const sampleRows = [
    {
      nombre: "Ana",
      apellido: "Perez",
      email: "ana@empresa.com",
      curp: "PEAA900101HBCXXX01",
      departamento: "Operaciones",
      puesto: "Supervisor",
      ocupacion_especifica_clave: "03.4",
      ocupacion_especifica: "Instalacion y mantenimiento",
      password: "Temporal123",
    },
    {
      nombre: "Luis",
      apellido: "Lopez",
      email: "luis@empresa.com",
      curp: "LOPL910202HBCXXX02",
      departamento: "Seguridad",
      puesto: "Supervisor",
      ocupacion_especifica_clave: "07.2",
      ocupacion_especifica: "Supervision de seguridad",
      password: "Temporal123",
    },
  ]

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {columns.map((column) => (
          <span
            key={column.key}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              column.required
                ? "border-[#F5853F]/30 bg-[#fff2eb] text-[#D96B20]"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {column.label}
          </span>
        ))}
      </div>

      <form
        action={importEmployeesCsvAction}
        className="grid gap-4"
        data-loading-message="Importando empleados..."
        data-loading-detail="Estamos leyendo el CSV, creando usuarios y sincronizando accesos. Mantendremos este modal abierto hasta terminar."
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
            className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#F5853F]"
          />
        </label>

        <div className="max-w-full overflow-hidden rounded-xl border border-[#f0f0f0] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-950">Ejemplo visual tipo Excel</p>
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  CSV
                </span>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                Copia estos encabezados exactamente. Las columnas marcadas como obligatorias deben venir llenas.
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#fff2eb] px-2.5 py-1 text-[#D96B20]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F5853F]" />
                  Obligatorio
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Opcional
                </span>
              </div>
            </div>

            <a
              href="/api/templates/empleados-csv"
              className="inline-flex self-start items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100"
            >
              Descargar plantilla CSV
            </a>
          </div>

          <div className="mt-4 max-w-full overflow-x-auto rounded-xl border border-[#f0f0f0] bg-white shadow-inner">
            <table className="min-w-[1280px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-slate-100 text-center text-xs font-semibold text-slate-500">
                  <th className="w-12 border-b border-r border-slate-200 px-3 py-2" />
                  {columns.map((column, index) => (
                    <th
                      key={`letter-${column.key}`}
                      className="border-b border-r border-slate-200 px-4 py-2 last:border-r-0"
                    >
                      {String.fromCharCode(65 + index)}
                    </th>
                  ))}
                </tr>
                <tr className="bg-white text-left text-slate-800">
                  <th className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-semibold text-slate-500">
                    1
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="border-b border-r border-slate-200 px-4 py-3 last:border-r-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{column.label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            column.required
                              ? "bg-[#fff2eb] text-[#D96B20]"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {column.required ? "obligatorio" : "opcional"}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {sampleRows.map((row, rowIndex) => (
                  <tr key={row.email} className="transition hover:bg-[#fff2eb]/40">
                    <td className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-semibold text-slate-500">
                      {rowIndex + 2}
                    </td>
                    {columns.map((column) => (
                      <td
                        key={`${row.email}-${column.key}`}
                        className="whitespace-nowrap border-b border-r border-slate-200 px-4 py-3 last:border-r-0"
                      >
                        {row[column.key as keyof typeof row]}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-slate-50/70 text-slate-400">
                  <td className="border-r border-slate-200 px-3 py-3 text-center text-xs font-semibold">
                    ...
                  </td>
                  <td colSpan={columns.length} className="px-4 py-3 text-xs">
                    Puedes agregar mas empleados, uno por fila, hasta 200 registros por archivo.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3 grid gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950 md:grid-cols-[auto_1fr] md:items-start">
            <span className="rounded-full bg-amber-200 px-2.5 py-1 font-semibold text-amber-950">
              Nota
            </span>
            <p>
              Si el CSV no incluye la columna <span className="font-semibold">password</span>, captura arriba un password temporal por defecto para todos los empleados de esa carga.
            </p>
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex w-fit items-center rounded-full bg-[#F5853F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#D96B20]"
        >
          Importar empleados
        </button>
      </form>
    </div>
  )
}

export default async function EmpresaEmpleadosPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) redirect("/login")

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")
  const searchQuery = (readSearchParam(params, "q") ?? "").trim()
  const query = normalizeEmployeeSearchQuery(searchQuery)
  const status = normalizeEmployeeFilterStatus(readSearchParam(params, "status"))

  const empresa = await getRhEmpleadosSnapshot(session.user.empresa_id)
  if (!empresa) redirect("/login")

  const empleadosActivos = empresa.empleados.filter((e) => e.activo).length
  const empleadosInactivos = empresa.empleados.length - empleadosActivos
  const cuposDisponibles = Math.max(empresa.asientos_contratados - empleadosActivos, 0)
  const paqueteActivo = empresa.paquetes[0]?.paquete?.nombre ?? "Sin paquete"
  const employeesWithAccessIssues = empresa.empleados.filter((e) =>
    e.cursos.some((c) => c.acceso_estado === "ERROR")
  ).length
  const filteredEmployees = empresa.empleados.filter((e) =>
    matchesEmployeeFilters(e, { query, status })
  )
  const currentListPath = buildEmployeeListPath(searchQuery, status)
  const exportHref = `/api/empresa/empleados/export${
    currentListPath === "/empresa/empleados"
      ? ""
      : currentListPath.replace("/empresa/empleados", "")
  }`

  return (
    <div className="space-y-6">
      <PageHeader title="Empleados" description="Gestión de la plantilla de colaboradores" accentColor="#F5853F" />

      {success ? (
        <StatusNotice tone="success" message={getSuccessMessage(success, params) ?? success} />
      ) : null}
      {error ? (
        <StatusNotice tone="error" message={errorMessages[error] ?? error} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Paquete activo" value={paqueteActivo} icon={Package} borderColor="amber" />
        <KpiCard label="Activos" value={String(empleadosActivos)} sub="Con acceso vigente" icon={Users} borderColor="orange" />
        <KpiCard label="Cupos disponibles" value={String(cuposDisponibles)} sub="Antes del límite" icon={ShieldCheck} borderColor="charcoal" />
        <KpiCard label="Suspendidos" value={String(empleadosInactivos)} icon={UserX} borderColor="rose" />
        <KpiCard label="Con alertas" value={String(employeesWithAccessIssues)} sub="Error de acceso" icon={AlertCircle} borderColor="amber" />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-[#f0f0f0] bg-white px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-950">Sincronización académica</p>
          <p className="text-xs text-slate-400">
            Actualiza cursos, progreso y constancias en segundo plano.
          </p>
        </div>
        <form action={triggerCompanyLearningSyncAction}>
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Actualizar
          </button>
        </form>
      </div>

      <section>
        <EmployeeOnboardingTabs
          manualContent={<ManualEmployeeForm />}
          csvContent={<CsvEmployeeImportForm />}
        />
      </section>

      <section className="rounded-xl border border-[#f0f0f0] bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-950">
            Plantilla actual
            <span className="ml-2 text-sm font-normal text-slate-400">
              {filteredEmployees.length} de {empresa.empleados.length}
            </span>
          </h2>
          <a
            href={exportHref}
            className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Exportar CSV
          </a>
        </div>

        <form className="mb-4 flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={searchQuery}
            placeholder="Nombre, correo, área o puesto..."
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#F5853F]"
          />
          <select
            name="status"
            defaultValue={status}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#F5853F]"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Suspendidos</option>
          </select>
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Filtrar
          </button>
          {(searchQuery || status !== "all") ? (
            <a
              href="/empresa/empleados"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Limpiar
            </a>
          ) : null}
        </form>

        <div className="space-y-2">
          {empresa.empleados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Aún no hay empleados registrados para esta empresa.
            </div>
          ) : null}

          {empresa.empleados.length > 0 && filteredEmployees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No encontramos empleados que coincidan con ese filtro.
            </div>
          ) : null}

          {filteredEmployees.map((empleado) => {
            const activeCourseCount = empleado.cursos.filter(
              (c) => c.acceso_estado === "ACTIVE"
            ).length
            const errorCourseCount = empleado.cursos.filter(
              (c) => c.acceso_estado === "ERROR"
            ).length
            const initials = getInitials(`${empleado.nombre} ${empleado.apellido}`)

            return (
              <div
                key={empleado.id}
                className="flex items-center gap-3 rounded-xl border border-[#f0f0f0] bg-white px-4 py-3 transition hover:bg-slate-50/50"
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                    errorCourseCount > 0
                      ? "bg-rose-50 text-rose-700"
                      : empleado.activo
                        ? "bg-[#fff2eb] text-[#F5853F]"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {empleado.nombre} {empleado.apellido}
                    </p>
                    <StatusBadge variant={empleado.activo ? "green" : "slate"} dot>
                      {empleado.activo ? "Activo" : "Suspendido"}
                    </StatusBadge>
                    {errorCourseCount > 0 && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                        {errorCourseCount} error{errorCourseCount > 1 ? "es" : ""}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {empleado.email}
                    {empleado.departamento ? ` · ${empleado.departamento}` : ""}
                    {empleado.puesto ? ` · ${empleado.puesto}` : ""}
                  </p>
                </div>

                <div className="hidden text-right text-xs text-slate-500 md:block">
                  <p className="font-medium text-slate-700">{activeCourseCount} cursos activos</p>
                  <p>Alta: {formatDate(empleado.created_at)}</p>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <form action={toggleEmployeeStatusAction}>
                    <input type="hidden" name="empleado_id" value={empleado.id} />
                    <input type="hidden" name="return_to" value={currentListPath} />
                    <button
                      type="submit"
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        empleado.activo
                          ? "bg-[#1a1a1a] text-white hover:bg-[#333]"
                          : "bg-[#F5853F] text-white hover:bg-[#D96B20]"
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
          })}
        </div>
      </section>
    </div>
  )
}
