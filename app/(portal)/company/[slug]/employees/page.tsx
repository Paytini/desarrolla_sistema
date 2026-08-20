import CnoSelect from "@/components/company/CnoSelect";
import CsvEmployeeImportForm from "@/components/company/CsvEmployeeImportForm";
import CurpInfoButton from "@/components/company/CurpInfoButton";
import DeleteEmployeeButton from "@/components/company/DeleteEmployeeButton";
import EmployeeListFilters from "@/components/company/EmployeeListFilters";
import EmployeeOnboardingModal from "@/components/company/EmployeeOnboardingModal";
import KpiCard from "@/components/shared/KpiCard";
import { PageHeader } from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import StatusToast from "@/components/shared/StatusToast";
import { AlertCircle, Package, ShieldCheck, Users, UserX } from "lucide-react";
import {
  matchesEmployeeFilters,
  normalizeEmployeeFilterStatus,
  normalizeEmployeeSearchQuery,
} from "@/lib/company-employees";
import { getHrEmployeesSnapshot } from "@/lib/dashboard-cache";
import { formatDate, getInitials } from "@/lib/format";
import { paginate } from "@/lib/pagination";
import { readSearchParam } from "@/lib/search-params";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { companyPath } from "@/lib/company-routes";
import { Pagination } from "@/components/shared/Pagination";
import {
  createEmployeeAction,
  deleteEmployeeAction,
  toggleEmployeeStatusAction,
  triggerCompanyLearningSyncAction,
} from "./actions";

export const maxDuration = 300;

const successMessages: Record<string, string> = {
  empleado_creado:
    "El empleado se creo correctamente. Le enviamos un correo para que active su cuenta.",
  empleado_creado_sync:
    "El empleado se creo y su acceso ya quedo activo. Le enviamos un correo para que active su cuenta. El siguiente paso es asignarle cursos desde RH > Asignaciones.",
  empleado_suspendido:
    "El empleado fue suspendido y su acceso al portal quedo inhabilitado.",
  empleado_activado: "El empleado fue reactivado correctamente.",
  empleado_eliminado:
    "El empleado se elimino del portal y su cupo fue liberado.",
  sync_background_started:
    "Estamos actualizando los cursos, avances y constancias de tu equipo. Puedes seguir usando el portal mientras terminamos.",
  sync_background_already_running:
    "Ya hay una actualización en curso. En unos minutos verás la información más reciente.",
};

const errorMessages: Record<string, string> = {
  datos: "Faltan datos obligatorios para registrar al empleado.",
  email: "Ese correo ya existe como empleado o usuario del portal.",
  cupos: "La empresa ya alcanzo el limite de empleados contratados.",
  empresa: "No se encontro la empresa asociada a tu cuenta.",
  empleado: "No se encontro el empleado solicitado.",
  bridge_sync:
    "El empleado se creo en el portal, pero no fue posible activar su acceso a los cursos. Intenta de nuevo en unos minutos.",
  asignacion_manual:
    "El empleado se creo, pero aun no tiene cursos asignados. Asignalo desde RH > Asignaciones segun su area.",
  csv_file: "Selecciona un archivo CSV valido para importar empleados.",
  csv_empty:
    "El archivo CSV no contiene filas suficientes para importar empleados.",
  csv_limit:
    "El archivo CSV excede el limite permitido de 200 filas por carga.",
  bridge_delete:
    "No fue posible eliminar el acceso del empleado a los cursos. El registro del portal se mantuvo intacto para evitar inconsistencias.",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSuccessMessage(
  success: string | undefined,
  params: Record<string, string | string[] | undefined> | undefined,
) {
  if (!success) return null;
  if (success === "csv_imported") {
    const created = readSearchParam(params, "created") ?? "0";
    const queued = readSearchParam(params, "queued") === "1";
    const skipped = readSearchParam(params, "skipped") ?? "0";
    const syncNote = queued
      ? "El acceso a cursos se esta activando en segundo plano."
      : "";
    return `Importacion completada. Creados: ${created}. Omitidos: ${skipped}. Cada empleado recibira un correo para activar su cuenta. ${syncNote}`.trim();
  }
  return successMessages[success] ?? success;
}

function buildEmployeeListPath(
  slug: string,
  query: string,
  status: string,
  page: number = 1,
) {
  const basePath = companyPath(slug, "/employees");
  const searchParams = new URLSearchParams();
  if (query) searchParams.set("q", query);
  if (status !== "all") searchParams.set("status", status);
  if (page > 1) searchParams.set("page", String(page));
  const serialized = searchParams.toString();
  return serialized ? `${basePath}?${serialized}` : basePath;
}

function ManualEmployeeForm() {
  return (
    <form
      action={createEmployeeAction}
      autoComplete="off"
      className="grid gap-3"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-[14px] font-normal text-slate-700">
            Apellido paterno
          </span>
          <input
            name="apellido"
            required
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#3579F5]"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-[14px] font-normal text-slate-700">
            Apellido materno{" "}
            <span className="text-[12px] font-normal text-slate-400">
              (opcional)
            </span>
          </span>
          <input
            name="apellido_materno"
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#3579F5]"
          />
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        <span className="text-[14px] font-normal text-slate-700">
          Nombre(s)
        </span>
        <input
          name="nombre"
          required
          className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#3579F5]"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-[14px] font-normal text-slate-700">
            Correo electrónico
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="off"
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#3579F5]"
          />
        </label>
      </div>

      <p className="text-xs text-slate-500">
        El empleado recibirá un correo para crear su propia contraseña y activar su cuenta.
      </p>

      <div className="rounded-lg bg-gray-50 p-3">
        <p className="mb-2 text-xs text-slate-500">
          Constancia DC-3 <span className="text-slate-400">(opcional)</span>
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="flex items-center gap-1.5 text-[14px] font-normal text-slate-700">
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
          <span className="text-[14px] font-normal text-slate-700">
            Departamento{" "}
            <span className="text-[12px] font-normal text-slate-400">
              (opcional)
            </span>
          </span>
          <input
            name="departamento"
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#3579F5]"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-[14px] font-normal text-slate-700">
            Puesto{" "}
            <span className="text-[12px] font-normal text-slate-400">
              (opcional)
            </span>
          </span>
          <input
            name="puesto"
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-[#3579F5]"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center rounded-full bg-[#3579F5] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2A61D6]"
        >
          Crear empleado
        </button>
      </div>
    </form>
  );
}

export default async function CompanyEmployeesPage({
  searchParams,
}: PageProps) {
  const session = await getSession();
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id)
    redirect("/login");

  const params = await searchParams;
  const success = readSearchParam(params, "success");
  const error = readSearchParam(params, "error");
  const searchQuery = (readSearchParam(params, "q") ?? "").trim();
  const query = normalizeEmployeeSearchQuery(searchQuery);
  const status = normalizeEmployeeFilterStatus(
    readSearchParam(params, "status"),
  );
  const page = Math.max(1, Number(readSearchParam(params, "page") ?? "1"));

  const company = await getHrEmployeesSnapshot(session.user.empresa_id);
  if (!company) redirect("/login");

  const activeEmployees = company.employees.filter((e) => e.active).length;
  const inactiveEmployees = company.employees.length - activeEmployees;
  const availableSeats = Math.max(
    company.contracted_seats - activeEmployees,
    0,
  );
  const activePackage = company.packages[0]?.package?.name ?? "Sin paquete";
  const employeesWithAccessIssues = company.employees.filter((e) =>
    e.courses.some((c) => c.access_status === "ERROR"),
  ).length;
  const filteredEmployees = company.employees.filter((e) =>
    matchesEmployeeFilters(e, { query, status }),
  );
  const PAGE_SIZE = 20;
  const {
    items: pagedEmployees,
    currentPage,
    totalPages,
  } = paginate(filteredEmployees, page, PAGE_SIZE);
  const employeesBasePath = companyPath(company.slug, "/employees");
  const currentListPath = buildEmployeeListPath(
    company.slug,
    searchQuery,
    status,
    currentPage,
  );
  const exportHref = `/api/company/employees/export${
    currentListPath === employeesBasePath
      ? ""
      : currentListPath.replace(employeesBasePath, "")
  }`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empleados"
        description="Gestión de la plantilla de colaboradores"
        breadcrumbs={[
          { label: "Empresa", href: companyPath(company.slug, "/home") },
          { label: "Empleados" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <form action={triggerCompanyLearningSyncAction}>
              <button
                type="submit"
                title="Obtén el progreso y las constancias más recientes de tu equipo"
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Actualizar
              </button>
            </form>
            <EmployeeOnboardingModal
              manualContent={<ManualEmployeeForm />}
              csvContent={<CsvEmployeeImportForm />}
            />
          </div>
        }
      />

      {success ? (
        <StatusToast
          tone="success"
          message={getSuccessMessage(success, params) ?? success}
        />
      ) : null}
      {error ? (
        <StatusToast tone="error" message={errorMessages[error] ?? error} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Paquete activo"
          value={activePackage}
          icon={Package}
          borderColor="violet"
        />
        <KpiCard
          label="Activos"
          value={String(activeEmployees)}
          sub="Con acceso vigente"
          icon={Users}
          borderColor="emerald"
        />
        <KpiCard
          label="Cupos disponibles"
          value={String(availableSeats)}
          sub="Antes del límite"
          icon={ShieldCheck}
          borderColor="charcoal"
        />
        <KpiCard
          label="Suspendidos"
          value={String(inactiveEmployees)}
          icon={UserX}
          borderColor="rose"
        />
        <KpiCard
          label="Con alertas"
          value={String(employeesWithAccessIssues)}
          sub="Error de acceso"
          icon={AlertCircle}
          borderColor="amber"
        />
      </div>

      <section className="rounded-lg bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-950">
            Plantilla actual{" "}
            <span className="ml-2 text-sm font-normal text-slate-400">
              {filteredEmployees.length} de {company.employees.length}
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

        <div className="space-y-2">
          {company.employees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Aún no hay empleados registrados para esta empresa.
            </div>
          ) : null}

          {company.employees.length > 0 && filteredEmployees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No encontramos empleados que coincidan con ese filtro.
            </div>
          ) : null}

          {pagedEmployees.map((employee) => {
            const activeCourseCount = employee.courses.filter(
              (c) => c.access_status === "ACTIVE",
            ).length;
            const errorCourseCount = employee.courses.filter(
              (c) => c.access_status === "ERROR",
            ).length;
            const initials = getInitials(
              `${employee.first_name} ${employee.last_name}`,
            );

            return (
              <div
                key={employee.id}
                className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 transition-all duration-200 hover:bg-gray-50"
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                    errorCourseCount > 0
                      ? "bg-rose-50 text-rose-700"
                      : employee.active
                        ? "bg-[#EAF1FE] text-[#3579F5]"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <StatusBadge
                      variant={employee.active ? "green" : "slate"}
                      dot
                    >
                      {employee.active ? "Activo" : "Suspendido"}
                    </StatusBadge>
                    {errorCourseCount > 0 && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                        {errorCourseCount} error
                        {errorCourseCount > 1 ? "es" : ""}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {employee.email}
                    {employee.department ? ` · ${employee.department}` : ""}
                    {employee.position ? ` · ${employee.position}` : ""}
                  </p>
                </div>

                <div className="hidden text-right text-xs text-slate-500 md:block">
                  <p className="text-[14px] font-normal text-slate-700">
                    {activeCourseCount} cursos activos
                  </p>
                  <p>Alta: {formatDate(employee.created_at)}</p>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <form action={toggleEmployeeStatusAction}>
                    <input
                      type="hidden"
                      name="empleado_id"
                      value={employee.id}
                    />
                    <input
                      type="hidden"
                      name="return_to"
                      value={currentListPath}
                    />
                    <button
                      type="submit"
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        employee.active
                          ? "bg-[#1a1a1a] text-white hover:bg-[#333]"
                          : "bg-[#3579F5] text-white hover:bg-[#2A61D6]"
                      }`}
                    >
                      {employee.active ? "Suspender" : "Reactivar"}
                    </button>
                  </form>
                  <DeleteEmployeeButton
                    action={deleteEmployeeAction}
                    employeeId={employee.id}
                    employeeName={`${employee.first_name} ${employee.last_name}`.trim()}
                    returnTo={currentListPath}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={filteredEmployees.length}
          buildPageUrl={(p) =>
            buildEmployeeListPath(company.slug, searchQuery, status, p)
          }
        />
      </section>
    </div>
  );
}
