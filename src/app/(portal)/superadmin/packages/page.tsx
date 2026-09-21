import { AssignPackagePopover } from "@/components/superadmin/AssignPackagePopover"
import { PackageRow } from "@/components/superadmin/PackageRow"
import { PanelBox } from "@/components/superadmin/PanelBox"
import { PageHeader } from "@/components/shared/PageHeader"
import { ListFilters } from "@/components/shared/ListFilters"
import { DataTable } from "@/components/shared/DataTable"
import { getSuperadminPackagesSnapshot } from "@/lib/dashboard-cache"
import { getDc3MissingFields, type Dc3MetadataView } from "@/lib/dc3/fields"
import { readDecodedSearchParam, readSearchParam } from "@/lib/search-params"
import { paginate } from "@/lib/pagination"
import { Package, Plus } from "lucide-react"
import Link from "next/link"
import {
  assignPackageToCompanyAction,
  getPackageSyncImpactAction,
  syncPackageToCompanyEmployeesAction,
} from "./actions"
import { DismissibleAlert } from "@/components/shared/DismissibleAlert"
import { SyncPackageButton } from "@/components/superadmin/SyncPackageButton"
import { Pagination } from "@/components/shared/Pagination"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"

const successMessages: Record<string, string> = {
  paquete_creado: "El paquete se creó correctamente.",
  paquete_eliminado: "El paquete se eliminó del catálogo.",
  paquete_asignado: "El paquete activo de la empresa se actualizó correctamente.",
  paquete_actualizado: "El paquete se actualizó correctamente.",
  sync_queued:
    "Se encoló la sincronización de cursos con los empleados activos. Verás el progreso en unos minutos.",
}

const errorMessages: Record<string, string> = {
  paquete: "No fue posible eliminar el paquete.",
  paquete_asignado: "No puedes eliminar un paquete activo en una empresa.",
  asignacion: "No fue posible asignar el paquete.",
  sync: "No fue posible sincronizar. Revisa que exista paquete activo y empleados con WP user ID.",
}

const PAGE_SIZE = 20

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SuperAdminPackagesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")
  const detail = readDecodedSearchParam(params, "detail")

  const q = readSearchParam(params, "q")?.toLowerCase() ?? ""
  const dc3Filter = readSearchParam(params, "dc3") ?? "all"
  const assignedFilter = readSearchParam(params, "asignado") ?? "all"
  const sort = readSearchParam(params, "sort") ?? "recientes"
  const page = Math.max(1, Number(readSearchParam(params, "page") ?? "1"))
  const companyQ = readSearchParam(params, "empresa_q")?.toLowerCase() ?? ""
  const companyPage = Math.max(1, Number(readSearchParam(params, "empresa_page") ?? "1"))

  const {
    paquetes: packages,
    empresas: companies,
    dc3MetadataByCourseId,
  } = await getSuperadminPackagesSnapshot()

  const packagesWithStats = packages.map((pkg) => {
    const dc3Complete = pkg.courses.filter((c) => {
      const meta = dc3MetadataByCourseId[String(c.wp_course_id)] as Dc3MetadataView | undefined
      return getDc3MissingFields(meta).length === 0
    }).length
    const dc3Total = pkg.courses.length
    const dc3AllOk = dc3Total > 0 && dc3Complete === dc3Total
    const companyNames = pkg.companies.map((e) => e.company.name)
    return { pkg, dc3Complete, dc3Total, dc3AllOk, companyNames }
  })

  const filteredPackages = packagesWithStats.filter(({ pkg, dc3AllOk, dc3Total, companyNames }) => {
    const matchQ = q ? pkg.name.toLowerCase().includes(q) : true
    const matchDc3 =
      dc3Filter === "completo"
        ? dc3AllOk
        : dc3Filter === "incompleto"
          ? dc3Total > 0 && !dc3AllOk
          : dc3Filter === "sin_cursos"
            ? dc3Total === 0
            : true
    const matchAssigned =
      assignedFilter === "asignado"
        ? companyNames.length > 0
        : assignedFilter === "sin_asignar"
          ? companyNames.length === 0
          : true
    return matchQ && matchDc3 && matchAssigned
  })

  const sortedPackages = [...filteredPackages].sort((a, b) => {
    if (sort === "nombre") return a.pkg.name.localeCompare(b.pkg.name)
    if (sort === "empresas") return b.companyNames.length - a.companyNames.length
    return new Date(b.pkg.created_at).getTime() - new Date(a.pkg.created_at).getTime()
  })

  const {
    items: pagedPackages,
    currentPage,
    totalPages,
  } = paginate(sortedPackages, page, PAGE_SIZE)

  const filteredCompanies = companyQ
    ? companies.filter((c) => c.name.toLowerCase().includes(companyQ))
    : companies
  const {
    items: pagedCompanies,
    currentPage: companiesCurrentPage,
    totalPages: companiesTotalPages,
  } = paginate(filteredCompanies, companyPage, PAGE_SIZE)

  function companiesPageUrl(p: number) {
    const qs = companyQuery()
    if (p > 1) qs.set("empresa_page", String(p))
    const str = qs.toString()
    return `/superadmin/packages${str ? `?${str}` : ""}#asignacion-por-empresa`
  }

  function catalogQuery() {
    const qs = new URLSearchParams()
    if (q) qs.set("q", q)
    if (dc3Filter !== "all") qs.set("dc3", dc3Filter)
    if (assignedFilter !== "all") qs.set("asignado", assignedFilter)
    if (sort !== "recientes") qs.set("sort", sort)
    return qs
  }

  function companyQuery() {
    const qs = new URLSearchParams()
    if (companyQ) qs.set("empresa_q", companyQ)
    return qs
  }

  function pageUrl(p: number) {
    const qs = catalogQuery()
    if (p > 1) qs.set("page", String(p))
    const str = qs.toString()
    return `/superadmin/packages${str ? `?${str}` : ""}`
  }

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <PageHeader
        title="Gestión de paquetes"
        description="Define paquetes con cursos de Tutor LMS, asígnalos a empresas y sincroniza empleados."
        action={
          <Link href="/superadmin/packages/new" style={{ textDecoration: "none" }}>
            <Button
              variant="contained"
              startIcon={<Plus size={14} strokeWidth={2.5} />}
              sx={{ height: 44, px: 3, borderRadius: "10px" }}
            >
              Nuevo paquete
            </Button>
          </Link>
        }
      />

      {success && (
        <DismissibleAlert severity="success">
          {successMessages[success] ?? success}
        </DismissibleAlert>
      )}
      {error && (
        <DismissibleAlert severity="error">
          {detail
            ? `${errorMessages[error] ?? error} — ${detail}`
            : (errorMessages[error] ?? error)}
        </DismissibleAlert>
      )}

      <PanelBox
        title="Catálogo de paquetes"
        titleSx={{ fontSize: "1.25rem" }}
        noPadding
        action={
          packages.length > 0 ? (
            <ListFilters
              searchPlaceholder="Buscar paquete…"
              initialQuery={q}
              extraQuery={companyQuery().toString()}
              selects={[
                {
                  name: "dc3",
                  defaultValue: "all",
                  initialValue: dc3Filter,
                  ariaLabel: "Filtrar por estado DC-3",
                  options: [
                    { value: "all", label: "DC-3: todos" },
                    { value: "completo", label: "DC-3 completo" },
                    { value: "incompleto", label: "DC-3 incompleto" },
                    { value: "sin_cursos", label: "Sin cursos" },
                  ],
                },
                {
                  name: "asignado",
                  defaultValue: "all",
                  initialValue: assignedFilter,
                  ariaLabel: "Filtrar por asignación",
                  options: [
                    { value: "all", label: "Asignación: todas" },
                    { value: "asignado", label: "Asignado a empresa" },
                    { value: "sin_asignar", label: "Sin asignar" },
                  ],
                },
                {
                  name: "sort",
                  defaultValue: "recientes",
                  initialValue: sort,
                  ariaLabel: "Ordenar por",
                  options: [
                    { value: "recientes", label: "Más recientes" },
                    { value: "nombre", label: "Nombre A-Z" },
                    { value: "empresas", label: "Más empresas asignadas" },
                  ],
                },
              ]}
            />
          ) : undefined
        }
      >
        <div className="px-2">
          <DataTable
            ariaLabel="Catálogo de paquetes"
            headerClassName="bg-slate-50 pt-2 first:rounded-l-lg last:rounded-r-lg text-sm font-normal normal-case tracking-normal text-slate-700"
            columns={[
              { label: "", className: "w-8" },
              { label: "Paquete" },
              { label: "Cursos", className: "hidden sm:table-cell" },
              { label: "Empresas", className: "hidden md:table-cell" },
              { label: "DC-3" },
              { label: <span className="sr-only">Acciones</span> },
            ]}
            rows={pagedPackages.map(({ pkg, dc3Complete, dc3Total, dc3AllOk, companyNames }, index) => (
              <PackageRow
                key={pkg.id}
                pkg={pkg}
                dc3Complete={dc3Complete}
                dc3Total={dc3Total}
                dc3AllOk={dc3AllOk}
                companyNames={companyNames}
                dc3MetadataByCourseId={dc3MetadataByCourseId}
                index={index}
              />
            ))}
            emptyState={{
              icon: <Package size={28} className="text-slate-300" />,
              message:
                packages.length === 0
                  ? "Aún no hay paquetes registrados."
                  : "Sin resultados para ese filtro.",
            }}
          />
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={sortedPackages.length}
          buildPageUrl={pageUrl}
          variant="numbered"
        />
      </PanelBox>

      <PanelBox
        id="asignacion-por-empresa"
        title="Asignación por empresa"
        titleSx={{ fontSize: "1.25rem" }}
        action={
          <ListFilters
            searchPlaceholder="Buscar empresa…"
            initialQuery={companyQ}
            searchParamName="empresa_q"
            extraQuery={catalogQuery().toString()}
          />
        }
        noPadding
      >
        <div className="px-2">
          <DataTable
            ariaLabel="Asignación por empresa"
            headerClassName="bg-slate-50 pt-2 first:rounded-l-lg last:rounded-r-lg text-sm font-normal normal-case tracking-normal text-slate-700"
            columns={[
              { label: "SL" },
              { label: "Empresa" },
              { label: "Paquete activo" },
              { label: "Cambiar paquete" },
              { label: "Empleados", className: "hidden sm:table-cell" },
              { label: <span className="sr-only">Sync</span> },
            ]}
            rows={pagedCompanies.map((company, index) => {
              const activePackage = company.packages[0]?.package
              const syncable = company.syncableEmployeeCount

              return (
                <tr
                  key={company.id}
                  className={
                    index % 2 === 0
                      ? "bg-white transition-colors hover:bg-slate-100"
                      : "bg-slate-50 transition-colors hover:bg-slate-100"
                  }
                >
                  <td className="rounded-l-lg px-4 py-3 text-sm text-slate-400">
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3 text-base font-medium text-slate-900">
                    {company.name}
                  </td>
                  <td className="px-4 py-3">
                    {activePackage ? (
                      <span className="inline-flex h-6 items-center rounded-full border border-slate-200 px-2 text-xs text-slate-600">
                        {activePackage.name}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500">Sin paquete</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <AssignPackagePopover
                      companyId={company.id}
                      currentPackageId={company.packages[0]?.package_id}
                      packages={packages}
                      action={assignPackageToCompanyAction}
                    />
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-slate-500 sm:table-cell">
                    {company.employeeCount} empleados · {syncable} con WP ID
                  </td>
                  <td className="rounded-r-lg px-4 py-3 text-right">
                    <SyncPackageButton
                      companyId={company.id}
                      action={syncPackageToCompanyEmployeesAction}
                      getImpact={getPackageSyncImpactAction}
                    />
                  </td>
                </tr>
              )
            })}
            emptyState={{ message: "Sin resultados para ese filtro." }}
          />
        </div>
        <Pagination
          currentPage={companiesCurrentPage}
          totalPages={companiesTotalPages}
          totalResults={filteredCompanies.length}
          buildPageUrl={companiesPageUrl}
          variant="numbered"
        />
      </PanelBox>
    </Box>
  )
}
