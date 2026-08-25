import { PackageRow } from "@/components/superadmin/PackageRow"
import { PanelBox } from "@/components/superadmin/PanelBox"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { getSuperadminPackagesSnapshot } from "@/lib/dashboard-cache"
import { getDc3MissingFields, type Dc3MetadataView } from "@/lib/dc3"
import { readDecodedSearchParam, readSearchParam } from "@/lib/search-params"
import { paginate } from "@/lib/pagination"
import { Package, Plus, RotateCw, X } from "lucide-react"
import Link from "next/link"
import { assignPackageToCompanyAction, syncPackageToCompanyEmployeesAction } from "./actions"
import { DismissibleAlert } from "@/components/shared/DismissibleAlert"
import { SubmitButton } from "@/components/shared/SubmitButton"
import { Pagination } from "@/components/shared/Pagination"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import Typography from "@mui/material/Typography"

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

const TH_SX = {
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  color: "text.secondary",
  bgcolor: "action.hover",
  borderBottom: "1px solid",
  borderColor: "divider",
}

const TD_SX = { borderBottom: "1px solid", borderColor: "divider" }

const SELECT_SX = {
  height: 32,
  borderRadius: "8px",
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "#FFFFFF",
  px: 1,
  fontSize: 12,
  color: "text.primary",
  outline: "none",
  cursor: "pointer",
  "&:focus": { borderColor: "primary.main" },
}

const FILTER_SELECT_SX = {
  height: 40,
  borderRadius: "8px",
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "#FFFFFF",
  px: 1.5,
  fontSize: "13px",
  color: "text.primary",
  outline: "none",
  cursor: "pointer",
  "&:focus": { borderColor: "primary.main" },
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
    const qs = new URLSearchParams()
    if (companyQ) qs.set("empresa_q", companyQ)
    if (p > 1) qs.set("empresa_page", String(p))
    const str = qs.toString()
    return `/superadmin/packages${str ? `?${str}` : ""}#asignacion-por-empresa`
  }

  const hasFilters = q !== "" || dc3Filter !== "all" || assignedFilter !== "all"

  function pageUrl(p: number) {
    const qs = new URLSearchParams()
    if (q) qs.set("q", q)
    if (dc3Filter !== "all") qs.set("dc3", dc3Filter)
    if (assignedFilter !== "all") qs.set("asignado", assignedFilter)
    if (sort !== "recientes") qs.set("sort", sort)
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

      {packages.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box
            component="form"
            method="GET"
            sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}
          >
            <SearchInput name="q" defaultValue={q} placeholder="Buscar paquete…" width={200} />
            <Box component="select" name="dc3" defaultValue={dc3Filter} sx={FILTER_SELECT_SX}>
              <option value="all">DC-3: todos</option>
              <option value="completo">DC-3 completo</option>
              <option value="incompleto">DC-3 incompleto</option>
              <option value="sin_cursos">Sin cursos</option>
            </Box>
            <Box
              component="select"
              name="asignado"
              defaultValue={assignedFilter}
              sx={FILTER_SELECT_SX}
            >
              <option value="all">Asignación: todas</option>
              <option value="asignado">Asignado a empresa</option>
              <option value="sin_asignar">Sin asignar</option>
            </Box>
            <Box component="select" name="sort" defaultValue={sort} sx={FILTER_SELECT_SX}>
              <option value="recientes">Más recientes</option>
              <option value="nombre">Nombre A-Z</option>
              <option value="empresas">Más empresas asignadas</option>
            </Box>
            <Button
              type="submit"
              variant="outlined"
              size="small"
              sx={{
                bgcolor: "#FFFFFF",
                height: 40,
                px: 1.5,
                fontSize: 13,
                borderColor: "divider",
                color: "text.secondary",
              }}
            >
              Filtrar
            </Button>
            {hasFilters && (
              <Link
                href="/superadmin/packages"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  height: 40,
                  paddingLeft: 8,
                  paddingRight: 8,
                  fontSize: 12,
                  color: "#64748b",
                  textDecoration: "none",
                }}
              >
                <X size={12} strokeWidth={2.5} />
                Limpiar
              </Link>
            )}
          </Box>
        </Box>
      )}

      <PanelBox
        title="Catálogo de paquetes"
        description={`${sortedPackages.length} paquete${sortedPackages.length !== 1 ? "s" : ""}${hasFilters ? " · filtro activo" : ""}${totalPages > 1 ? ` · pág. ${currentPage}/${totalPages}` : ""}`}
        noPadding
      >
        {packages.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
              py: 8,
              textAlign: "center",
            }}
          >
            <Package size={28} style={{ color: "#cbd5e1" }} />
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              Aún no hay paquetes registrados.
            </Typography>
          </Box>
        ) : sortedPackages.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
              py: 8,
              textAlign: "center",
            }}
          >
            <Package size={28} style={{ color: "#cbd5e1" }} />
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              Sin resultados para ese filtro.
            </Typography>
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...TH_SX, width: 32 }} />
                  <TableCell sx={TH_SX}>Paquete</TableCell>
                  <TableCell sx={{ ...TH_SX, display: { xs: "none", sm: "table-cell" } }}>
                    Cursos
                  </TableCell>
                  <TableCell sx={{ ...TH_SX, display: { xs: "none", md: "table-cell" } }}>
                    Empresas
                  </TableCell>
                  <TableCell sx={TH_SX}>DC-3</TableCell>
                  <TableCell sx={{ ...TH_SX, display: { xs: "none", lg: "table-cell" } }}>
                    Alta
                  </TableCell>
                  <TableCell sx={{ ...TH_SX, textAlign: "right" }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedPackages.map(({ pkg, dc3Complete, dc3Total, dc3AllOk, companyNames }) => (
                  <PackageRow
                    key={pkg.id}
                    pkg={pkg}
                    dc3Complete={dc3Complete}
                    dc3Total={dc3Total}
                    dc3AllOk={dc3AllOk}
                    companyNames={companyNames}
                    dc3MetadataByCourseId={dc3MetadataByCourseId}
                  />
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderTop: "1px solid",
                  borderColor: "divider",
                  px: 2.5,
                  py: 1.5,
                }}
              >
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  {sortedPackages.length} resultado{sortedPackages.length !== 1 ? "s" : ""} · página{" "}
                  {currentPage} de {totalPages}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  {currentPage > 1 ? (
                    <Link
                      href={pageUrl(currentPage - 1)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        height: 28,
                        paddingLeft: 10,
                        paddingRight: 10,
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#0f172a",
                        textDecoration: "none",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      ← Anterior
                    </Link>
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      disabled
                      sx={{ height: 28, fontSize: 12 }}
                    >
                      ← Anterior
                    </Button>
                  )}
                  {currentPage < totalPages ? (
                    <Link
                      href={pageUrl(currentPage + 1)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        height: 28,
                        paddingLeft: 10,
                        paddingRight: 10,
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#0f172a",
                        textDecoration: "none",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      Siguiente →
                    </Link>
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      disabled
                      sx={{ height: 28, fontSize: 12 }}
                    >
                      Siguiente →
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </>
        )}
      </PanelBox>

      <PanelBox
        id="asignacion-por-empresa"
        title="Asignación por empresa"
        description={`Asigna el paquete activo de cada empresa y sincroniza con sus empleados.${companyQ ? " · filtro activo" : ""}`}
        action={
          <Box
            component="form"
            method="GET"
            sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
          >
            <SearchInput
              name="empresa_q"
              defaultValue={companyQ}
              placeholder="Buscar empresa…"
              width={200}
            />
            {companyQ && (
              <Link
                href="/superadmin/packages#asignacion-por-empresa"
                style={{ display: "inline-flex", alignItems: "center", color: "#64748b" }}
                aria-label="Limpiar búsqueda"
              >
                <X size={14} />
              </Link>
            )}
          </Box>
        }
        noPadding
      >
        {filteredCompanies.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              Sin resultados para ese filtro.
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={TH_SX}>Empresa</TableCell>
                <TableCell sx={TH_SX}>Paquete activo</TableCell>
                <TableCell sx={TH_SX}>Cambiar paquete</TableCell>
                <TableCell sx={{ ...TH_SX, display: { xs: "none", sm: "table-cell" } }}>
                  Empleados
                </TableCell>
                <TableCell sx={{ ...TH_SX, textAlign: "right" }}>Sync</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedCompanies.map((company) => {
                const activePackage = company.packages[0]?.package
                const syncable = company.employees.filter((e) => e.wp_user_id).length

                return (
                  <TableRow key={company.id} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                    <TableCell
                      sx={{ ...TD_SX, fontSize: 13, fontWeight: 500, color: "text.primary" }}
                    >
                      {company.name}
                    </TableCell>
                    <TableCell sx={TD_SX}>
                      {activePackage ? (
                        <Chip
                          label={activePackage.name}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: 11, "& .MuiChip-label": { px: 1 } }}
                        />
                      ) : (
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                          Sin paquete
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={TD_SX}>
                      <Box
                        component="form"
                        action={assignPackageToCompanyAction}
                        sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}
                      >
                        <input type="hidden" name="empresa_id" value={company.id} />
                        <Box
                          component="select"
                          name="paquete_id"
                          required
                          aria-label="Paquete"
                          defaultValue={company.packages[0]?.package_id ?? ""}
                          sx={SELECT_SX}
                        >
                          <option value="" disabled>
                            Selecciona un paquete
                          </option>
                          {packages.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </Box>
                        <Box
                          component="input"
                          type="date"
                          name="fecha_vencimiento"
                          aria-label="Fecha de vencimiento"
                          sx={SELECT_SX}
                        />
                        <SubmitButton
                          size="small"
                          variant="contained"
                          disableElevation
                          sx={{ height: 32, px: 2.5, fontSize: "0.8125rem", borderRadius: "8px" }}
                        >
                          Asignar
                        </SubmitButton>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ ...TD_SX, display: { xs: "none", sm: "table-cell" } }}>
                      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                        {company.employees.length} empleados · {syncable} con WP ID
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ ...TD_SX, textAlign: "right" }}>
                      <form action={syncPackageToCompanyEmployeesAction}>
                        <input type="hidden" name="empresa_id" value={company.id} />
                        <SubmitButton
                          variant="outlined"
                          size="small"
                          startIcon={<RotateCw size={11} />}
                          sx={{
                            height: 32,
                            fontSize: 12,
                            borderColor: "divider",
                            color: "text.secondary",
                            "&:hover": { borderColor: "text.secondary" },
                          }}
                        >
                          Sincronizar
                        </SubmitButton>
                      </form>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        <Pagination
          currentPage={companiesCurrentPage}
          totalPages={companiesTotalPages}
          totalResults={filteredCompanies.length}
          buildPageUrl={companiesPageUrl}
        />
      </PanelBox>
    </Box>
  )
}
