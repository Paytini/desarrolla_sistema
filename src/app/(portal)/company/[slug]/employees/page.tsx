import CsvEmployeeImportForm from "@/components/company/CsvEmployeeImportForm"
import EmployeeListFilters from "@/components/company/EmployeeListFilters"
import EmployeeRowActionsMenu from "@/components/company/EmployeeRowActionsMenu"
import EmployeeOnboardingModal from "@/components/company/EmployeeOnboardingModal"
import ManualEmployeeForm from "@/components/company/ManualEmployeeForm"
import { DataTable } from "@/components/shared/DataTable"
import { PageHeader } from "@/components/shared/PageHeader"
import ProgressBar from "@/components/shared/ProgressBar"
import StatusBadge from "@/components/shared/StatusBadge"
import StatusToast from "@/components/shared/StatusToast"
import Tooltip from "@mui/material/Tooltip"
import { Eye } from "lucide-react"
import Link from "next/link"
import {
  normalizeEmployeeFilterStatus,
  normalizeEmployeeSearchQuery,
} from "@/lib/company/employees"
import { cookies } from "next/headers"
import { getHrEmployeesSnapshot } from "@/lib/dashboard-cache"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { companyPath } from "@/lib/company/routes"
import { Pagination } from "@/components/shared/Pagination"
import { deleteEmployeeAction, toggleEmployeeStatusAction } from "./actions"

export const maxDuration = 300

const successMessages: Record<string, string> = {
  empleado_creado:
    "El empleado se creo correctamente. Ya puede iniciar sesion con la contrasena que capturaste.",
  empleado_creado_sync:
    "El empleado se creo y su acceso ya quedo activo, con la contrasena que capturaste. El siguiente paso es asignarle cursos desde HR > Asignaciones.",
  empleado_suspendido: "El empleado fue suspendido y su acceso al portal quedo inhabilitado.",
  empleado_activado: "El empleado fue reactivado correctamente.",
  empleado_eliminado: "El empleado se elimino del portal y su cupo fue liberado.",
  sync_background_started:
    "Estamos actualizando los cursos, avances y constancias de tu equipo. Puedes seguir usando el portal mientras terminamos.",
  sync_background_already_running:
    "Ya hay una actualización en curso. En unos minutos verás la información más reciente.",
}

const errorMessages: Record<string, string> = {
  datos: "Faltan datos obligatorios para registrar al empleado.",
  email: "Ese correo ya existe como empleado o usuario del portal.",
  cupos: "La empresa ya alcanzo el limite de empleados contratados.",
  empresa: "No se encontro la empresa asociada a tu cuenta.",
  empleado: "No se encontro el empleado solicitado.",
  bridge_sync:
    "El empleado se creo en el portal, pero no fue posible activar su acceso a los cursos. Intenta de nuevo en unos minutos.",
  asignacion_manual:
    "El empleado se creo, pero aun no tiene cursos asignados. Asignalo desde HR > Asignaciones segun su area.",
  csv_file: "Selecciona un archivo CSV valido para importar empleados.",
  csv_empty: "El archivo CSV no contiene filas suficientes para importar empleados.",
  csv_limit: "El archivo CSV excede el limite permitido de 200 filas por carga.",
  bridge_delete:
    "No fue posible eliminar el acceso del empleado a los cursos. El registro del portal se mantuvo intacto para evitar inconsistencias.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getSuccessMessage(
  success: string | undefined,
  params: Record<string, string | string[] | undefined> | undefined,
) {
  if (!success) return null
  if (success === "csv_imported") {
    const created = readSearchParam(params, "created") ?? "0"
    const queued = readSearchParam(params, "queued") === "1"
    const skipped = readSearchParam(params, "skipped") ?? "0"
    const syncNote = queued ? "El acceso a cursos se esta activando en segundo plano." : ""
    return `Importacion completada. Creados: ${created}. Omitidos: ${skipped}. Cada empleado ya puede iniciar sesion con la contrasena capturada o generada. ${syncNote}`.trim()
  }
  return successMessages[success] ?? success
}

function buildEmployeeListPath(slug: string, query: string, status: string, page: number = 1) {
  const basePath = companyPath(slug, "/employees")
  const searchParams = new URLSearchParams()
  if (query) searchParams.set("q", query)
  if (status !== "all") searchParams.set("status", status)
  if (page > 1) searchParams.set("page", String(page))
  const serialized = searchParams.toString()
  return serialized ? `${basePath}?${serialized}` : basePath
}

export default async function CompanyEmployeesPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== "HR" || !session.user.empresa_id) redirect("/login")

  const companyId = session.user.empresa_id
  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")
  const generatedPasswordsCookie = (await cookies()).get("d360_csv_generated_passwords")?.value
  const generatedPasswordsPayload: {
    passwords: Array<{ email: string; password: string }>
    omittedCount: number
  } = generatedPasswordsCookie
    ? JSON.parse(generatedPasswordsCookie)
    : { passwords: [], omittedCount: 0 }
  const generatedPasswords = generatedPasswordsPayload.passwords
  const omittedGeneratedPasswordsCount = generatedPasswordsPayload.omittedCount
  const searchQuery = (readSearchParam(params, "q") ?? "").trim()
  const query = normalizeEmployeeSearchQuery(searchQuery)
  const status = normalizeEmployeeFilterStatus(readSearchParam(params, "status"))
  const parsedPage = Number(readSearchParam(params, "page") ?? "1")
  const page = Number.isFinite(parsedPage) ? Math.max(1, Math.trunc(parsedPage)) : 1

  const snapshot = await getHrEmployeesSnapshot(companyId, query, status, page)
  if (!snapshot) redirect("/login")

  const { company, totalEmployees, filteredCount, totalPages, currentPage, pagedEmployees } =
    snapshot

  const employeesBasePath = companyPath(company.slug, "/employees")
  const currentListPath = buildEmployeeListPath(company.slug, searchQuery, status, currentPage)
  const exportHref = `/api/company/employees/export${
    currentListPath === employeesBasePath ? "" : currentListPath.replace(employeesBasePath, "")
  }`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empleados"
        description="Gestión de la plantilla de colaboradores"
        action={
          <EmployeeOnboardingModal
            manualContent={<ManualEmployeeForm />}
            csvContent={<CsvEmployeeImportForm />}
          />
        }
      />

      {success ? (
        <StatusToast tone="success" message={getSuccessMessage(success, params) ?? success} />
      ) : null}
      {generatedPasswords.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-950">
            Contraseñas generadas automáticamente
          </p>
          <p className="mb-3 text-xs text-amber-900">
            Estas filas del CSV no traían contraseña, así que se generó una por empleado. Compártela
            por un canal seguro — no volverá a mostrarse.
          </p>
          <ul className="grid gap-1 text-xs text-amber-950">
            {generatedPasswords.map((item) => (
              <li key={item.email} className="font-mono">
                {item.email}: {item.password}
              </li>
            ))}
          </ul>
          {omittedGeneratedPasswordsCount > 0 ? (
            <p className="mt-2 text-xs font-semibold text-amber-950">
              No se pudieron mostrar {omittedGeneratedPasswordsCount} contraseña
              {omittedGeneratedPasswordsCount === 1 ? "" : "s"} generada
              {omittedGeneratedPasswordsCount === 1 ? "" : "s"} más por límites del navegador.
              Vuelve a importar en lotes más pequeños, o especifica las contraseñas manualmente en
              el CSV para esos empleados.
            </p>
          ) : null}
        </div>
      ) : null}
      {error ? <StatusToast tone="error" message={errorMessages[error] ?? error} /> : null}

      <section className="rounded-lg bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-950">
            Plantilla actual{" "}
            <span className="ml-2 text-sm font-normal text-slate-400">
              {filteredCount} de {totalEmployees}
            </span>
          </h2>
          <a
            href={exportHref}
            className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Exportar CSV
          </a>
        </div>

        <EmployeeListFilters
          basePath={employeesBasePath}
          initialQuery={searchQuery}
          initialStatus={status}
        />

        <DataTable
          ariaLabel="Plantilla de empleados"
          columns={[
            { label: "Empleado" },
            { label: "Correo" },
            { label: "Puesto", className: "hidden md:table-cell" },
            { label: "Departamento", className: "hidden md:table-cell" },
            { label: "Avance", className: "hidden md:table-cell" },
            { label: "Estado", className: "hidden md:table-cell" },
            { label: <span className="sr-only">Acciones</span> },
          ]}
          rows={pagedEmployees.map((employee) => {
            const avgProgress = employee.courses.length
              ? Math.round(
                  employee.courses.reduce((sum, c) => sum + c.progress_pct, 0) /
                    employee.courses.length,
                )
              : 0

            return (
              <tr key={employee.id} className="bg-white transition-colors hover:bg-gray-50">
                <td className="min-w-0 rounded-l-lg py-3 pl-4">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {employee.first_name} {employee.last_name}
                  </p>
                </td>
                <td className="truncate px-4 py-3 text-sm text-slate-500">{employee.email}</td>
                <td className="hidden px-4 py-3 text-sm text-slate-700 md:table-cell">
                  {employee.position ?? "—"}
                </td>
                <td className="hidden px-4 py-3 text-sm text-slate-700 md:table-cell">
                  {employee.department ?? "—"}
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <div className="flex items-center gap-2">
                    <ProgressBar
                      value={avgProgress}
                      className="w-16 shrink-0 border border-slate-300"
                    />
                    <span className="w-9 shrink-0 text-sm tabular-nums text-slate-700">
                      {avgProgress}%
                    </span>
                  </div>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <StatusBadge variant={employee.active ? "green" : "slate"} dot>
                    {employee.active ? "Activo" : "Suspendido"}
                  </StatusBadge>
                </td>
                <td className="rounded-r-lg py-3 pr-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip title="Ver perfil">
                      <Link
                        href={companyPath(company.slug, `/employees/${employee.id}`)}
                        aria-label={`Ver perfil de ${employee.first_name} ${employee.last_name}`}
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] text-slate-500 transition hover:bg-gray-100 hover:text-slate-700"
                      >
                        <Eye size={18} strokeWidth={2} />
                      </Link>
                    </Tooltip>
                    <EmployeeRowActionsMenu
                      employeeId={employee.id}
                      employeeName={`${employee.first_name} ${employee.last_name}`.trim()}
                      employeeActive={employee.active}
                      returnTo={currentListPath}
                      toggleEmployeeStatusAction={toggleEmployeeStatusAction}
                      deleteEmployeeAction={deleteEmployeeAction}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
          emptyState={
            totalEmployees === 0
              ? { message: "Aún no hay empleados registrados para esta empresa." }
              : { message: "No encontramos empleados que coincidan con ese filtro." }
          }
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={filteredCount}
          buildPageUrl={(p) => buildEmployeeListPath(company.slug, searchQuery, status, p)}
        />
      </section>
    </div>
  )
}
