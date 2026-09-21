import {
  getSuperadminCompaniesListSnapshot,
  isCompaniesSortField,
  type CompaniesSortField,
} from "@/lib/dashboard-cache"
import { readSearchParam } from "@/lib/search-params"
import { CompaniesListFilters } from "@/components/superadmin/CompaniesListFilters"
import { CompanyRow } from "@/components/superadmin/CompanyRow"
import { PanelBox } from "@/components/superadmin/PanelBox"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable } from "@/components/shared/DataTable"
import { ArrowDown, ArrowUp, ArrowUpDown, Building2, Plus } from "lucide-react"
import Link from "next/link"
import { DismissibleAlert } from "@/components/shared/DismissibleAlert"
import { Pagination } from "@/components/shared/Pagination"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"

const successMessages: Record<string, string> = {
  empresa_creada: "Empresa creada correctamente con su usuario HR inicial.",
  empresa_suspendida: "Empresa suspendida.",
  empresa_activada: "Empresa reactivada correctamente.",
}
const errorMessages: Record<string, string> = {
  datos: "Faltan datos obligatorios.",
  email_hr: "Ese correo HR ya está ligado a una empresa.",
  usuario_hr: "Ese correo ya existe como usuario del portal.",
  empresa: "No se encontró la empresa.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function SortableHeader({
  href,
  label,
  direction,
}: {
  href: string
  label: string
  direction: "asc" | "desc" | null
}) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown
  return (
    <Link href={href} className="inline-flex items-center gap-1 hover:text-slate-700">
      {label}
      <Icon size={12} className={direction ? "text-slate-700" : "text-slate-400"} />
    </Link>
  )
}

export default async function CompaniesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")
  const q = readSearchParam(params, "q")?.toLowerCase() ?? ""
  const statusFilter = readSearchParam(params, "status") ?? "all"
  const page = Math.max(1, Number(readSearchParam(params, "page") ?? "1"))
  const sortParam = readSearchParam(params, "sort") ?? ""
  const sortBy: CompaniesSortField = isCompaniesSortField(sortParam) ? sortParam : "created_at"
  const sortDir: "asc" | "desc" = readSearchParam(params, "dir") === "asc" ? "asc" : "desc"

  const {
    companies: pagedCompanies,
    filteredCount,
    currentPage,
    totalPages,
  } = await getSuperadminCompaniesListSnapshot(q, statusFilter, page, sortBy, sortDir)

  function baseParams() {
    const qs = new URLSearchParams()
    if (q) qs.set("q", q)
    if (statusFilter !== "all") qs.set("status", statusFilter)
    if (sortBy !== "created_at") qs.set("sort", sortBy)
    if (sortDir !== "desc") qs.set("dir", sortDir)
    return qs
  }

  function pageUrl(p: number) {
    const qs = baseParams()
    if (p > 1) qs.set("page", String(p))
    const str = qs.toString()
    return `/superadmin/companies${str ? `?${str}` : ""}`
  }

  function sortUrl(field: CompaniesSortField) {
    const qs = baseParams()
    const nextDir = sortBy === field && sortDir === "asc" ? "desc" : "asc"
    qs.set("sort", field)
    qs.set("dir", nextDir)
    return `/superadmin/companies?${qs.toString()}`
  }

  function sortDirection(field: CompaniesSortField): "asc" | "desc" | null {
    return sortBy === field ? sortDir : null
  }

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <PageHeader
        title="Empresas clientes"
        description="Gestiona las organizaciones activas en la plataforma."
        action={
          <Link href="/superadmin/companies/new" style={{ textDecoration: "none" }}>
            <Button
              variant="contained"
              startIcon={<Plus size={14} strokeWidth={2.5} />}
              sx={{ height: 44, px: 3, borderRadius: "10px" }}
            >
              Nueva empresa
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
        <DismissibleAlert severity="error">{errorMessages[error] ?? error}</DismissibleAlert>
      )}

      <PanelBox
        title="Empresas registradas"
        titleSx={{ fontSize: "1.25rem" }}
        noPadding
        action={
          <CompaniesListFilters
            basePath="/superadmin/companies"
            initialQuery={q}
            initialStatus={statusFilter}
            sort={sortBy !== "created_at" ? sortBy : undefined}
            dir={sortDir !== "desc" ? sortDir : undefined}
          />
        }
      >
        <div className="px-2">
          <DataTable
            ariaLabel="Empresas registradas"
            headerClassName="bg-slate-50 pt-2 first:rounded-l-lg last:rounded-r-lg text-sm font-normal normal-case tracking-normal text-slate-700"
            columns={[
              { label: "SL" },
              {
                label: (
                  <SortableHeader
                    href={sortUrl("name")}
                    label="Empresa"
                    direction={sortDirection("name")}
                  />
                ),
              },
              { label: "RFC", className: "hidden sm:table-cell" },
              { label: "Plan", className: "hidden md:table-cell" },
              {
                label: (
                  <SortableHeader
                    href={sortUrl("contracted_seats")}
                    label="Cupos"
                    direction={sortDirection("contracted_seats")}
                  />
                ),
              },
              {
                label: (
                  <SortableHeader
                    href={sortUrl("created_at")}
                    label="Alta"
                    direction={sortDirection("created_at")}
                  />
                ),
                className: "hidden lg:table-cell",
              },
              {
                label: (
                  <SortableHeader
                    href={sortUrl("active")}
                    label="Estado"
                    direction={sortDirection("active")}
                  />
                ),
              },
              { label: <span className="sr-only">Acciones</span> },
            ]}
            rows={pagedCompanies.map((company, index) => (
              <CompanyRow key={company.id} company={company} index={index} />
            ))}
            emptyState={{
              icon: <Building2 size={28} className="text-slate-300" />,
              message:
                q || statusFilter !== "all"
                  ? "Sin resultados para ese filtro."
                  : "Aún no hay empresas registradas.",
            }}
          />
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalResults={filteredCount}
          buildPageUrl={pageUrl}
          variant="numbered"
        />
      </PanelBox>
    </Box>
  )
}
