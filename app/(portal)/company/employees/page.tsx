import CnoSelect from "@/components/company/CnoSelect"
import CurpInfoButton from "@/components/company/CurpInfoButton"
import DeleteEmployeeButton from "@/components/company/DeleteEmployeeButton"
import EmployeeOnboardingTabs from "@/components/company/EmployeeOnboardingTabs"
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
import { getHrEmployeesSnapshot } from "@/lib/dashboard-cache"
import { formatDate, getInitials } from "@/lib/format"
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
  return serialized ? `/company/employees?${serialized}` : "/company/employees"
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
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#3579F5]"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Apellido materno</span>
          <input
            name="apellido_materno"
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#3579F5]"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Nombre(s)</span>
          <input
            name="nombre"
            required
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#3579F5]"
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
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#3579F5]"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Password temporal</span>
          <input
            name="password"
            type="password"
            minLength={8}
            required
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#3579F5]"
          />
        </label>
      </div>

      <div className="rounded-lg bg-gray-50 p-3">
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
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 uppercase outline-none transition focus:border-[#3579F5]"
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
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#3579F5]"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Puesto</span>
          <input
            name="puesto"
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#3579F5]"
          />
        </label>
      </div>

      <button
        type="submit"
        className="inline-flex w-fit items-center rounded-full bg-[#3579F5] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2A61D6]"
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
                ? "border-[#3579F5]/30 bg-[#EAF1FE] text-[#2A61D6]"
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
            className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#3579F5]"
          />
        </label>

        <div className="max-w-full overflow-hidden rounded-lg bg-white p-4">
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
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF1FE] px-2.5 py-1 text-[#2A61D6]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3579F5]" />
                  Obligatorio
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Opcional
                </span>
              </div>
            </div>

            <a
              href="/api/templates/employees-csv"
              className="inline-flex self-start items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-slate-800 transition-all duration-200 hover:bg-gray-200"
            >
              Descargar plantilla CSV
            </a>
          </div>

          <div className="mt-4 max-w-full overflow-x-auto rounded-lg bg-white">
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
                              ? "bg-[#EAF1FE] text-[#2A61D6]"
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
                  <tr key={row.email} className="transition hover:bg-[#EAF1FE]/40">
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
          className="inline-flex w-fit items-center rounded-full bg-[#3579F5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2A61D6]"
        >
          Importar empleados
        </button>
      </form>
    </div>
  )
}

export default async function CompanyEmployeesPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) redirect("/login")

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")
  const searchQuery = (readSearchParam(params, "q") ?? "").trim()
  const query = normalizeEmployeeSearchQuery(searchQuery)
  const status = normalizeEmployeeFilterStatus(readSearchParam(params, "status"))

  const company = await getHrEmployeesSnapshot(session.user.empresa_id)
  if (!company) redirect("/login")

  const activeEmployees = company.empleados.filter((e) => e.activo).length
  const inactiveEmployees = company.empleados.length - activeEmployees
  const availableSeats = Math.max(company.asientos_contratados - activeEmployees, 0)
  const activePackage = company.paquetes[0]?.paquete?.nombre ?? "Sin paquete"
  const employeesWithAccessIssues = company.empleados.filter((e) =>
    e.cursos.some((c) => c.acceso_estado === "ERROR")
  ).length
  const filteredEmployees = company.empleados.filter((e) =>
    matchesEmployeeFilters(e, { query, status })
  )
  const currentListPath = buildEmployeeListPath(searchQuery, status)
  const exportHref = `/api/company/employees/export${
    currentListPath === "/company/employees"
      ? ""
      : currentListPath.replace("/company/employees", "")
  }`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empleados"
        description="Gestión de la plantilla de colaboradores"
        breadcrumbs={[{ label: "Empresa", href: "/company/home" }, { label: "Empleados" }]}
      />

      {success ? (
        <StatusNotice tone="success" message={getSuccessMessage(success, params) ?? success} />
      ) : null}
      {error ? (
        <StatusNotice tone="error" message={errorMessages[error] ?? error} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Paquete activo" value={activePackage} icon={Package} borderColor="violet" />
        <KpiCard label="Activos" value={String(activeEmployees)} sub="Con acceso vigente" icon={Users} borderColor="emerald" />
        <KpiCard label="Cupos disponibles" value={String(availableSeats)} sub="Antes del límite" icon={ShieldCheck} borderColor="charcoal" />
        <KpiCard label="Suspendidos" value={String(inactiveEmployees)} icon={UserX} borderColor="rose" />
        <KpiCard label="Con alertas" value={String(employeesWithAccessIssues)} sub="Error de acceso" icon={AlertCircle} borderColor="amber" />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg bg-white px-5 py-4">
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

      <section className="rounded-lg bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-950">
            Plantilla actual
            <span className="ml-2 text-sm font-normal text-slate-400">
              {filteredEmployees.length} de {company.empleados.length}
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
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#3579F5]"
          />
          <select
            name="status"
            defaultValue={status}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#3579F5]"
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
              href="/company/employees"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Limpiar
            </a>
          ) : null}
        </form>

        <div className="space-y-2">
          {company.empleados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Aún no hay empleados registrados para esta empresa.
            </div>
          ) : null}

          {company.empleados.length > 0 && filteredEmployees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No encontramos empleados que coincidan con ese filtro.
            </div>
          ) : null}

          {filteredEmployees.map((employee) => {
            const activeCourseCount = employee.cursos.filter(
              (c) => c.acceso_estado === "ACTIVE"
            ).length
            const errorCourseCount = employee.cursos.filter(
              (c) => c.acceso_estado === "ERROR"
            ).length
            const initials = getInitials(`${employee.nombre} ${employee.apellido}`)

            return (
              <div
                key={employee.id}
                className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 transition-all duration-200 hover:bg-gray-50"
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                    errorCourseCount > 0
                      ? "bg-rose-50 text-rose-700"
                      : employee.activo
                        ? "bg-[#EAF1FE] text-[#3579F5]"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {employee.nombre} {employee.apellido}
                    </p>
                    <StatusBadge variant={employee.activo ? "green" : "slate"} dot>
                      {employee.activo ? "Activo" : "Suspendido"}
                    </StatusBadge>
                    {errorCourseCount > 0 && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                        {errorCourseCount} error{errorCourseCount > 1 ? "es" : ""}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {employee.email}
                    {employee.departamento ? ` · ${employee.departamento}` : ""}
                    {employee.puesto ? ` · ${employee.puesto}` : ""}
                  </p>
                </div>

                <div className="hidden text-right text-xs text-slate-500 md:block">
                  <p className="font-medium text-slate-700">{activeCourseCount} cursos activos</p>
                  <p>Alta: {formatDate(employee.created_at)}</p>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <form action={toggleEmployeeStatusAction}>
                    <input type="hidden" name="empleado_id" value={employee.id} />
                    <input type="hidden" name="return_to" value={currentListPath} />
                    <button
                      type="submit"
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        employee.activo
                          ? "bg-[#1a1a1a] text-white hover:bg-[#333]"
                          : "bg-[#3579F5] text-white hover:bg-[#2A61D6]"
                      }`}
                    >
                      {employee.activo ? "Suspender" : "Reactivar"}
                    </button>
                  </form>
                  <DeleteEmployeeButton
                    action={deleteEmployeeAction}
                    employeeId={employee.id}
                    employeeName={`${employee.nombre} ${employee.apellido}`.trim()}
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
