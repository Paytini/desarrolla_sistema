import { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"
import { readSearchParam } from "@/lib/search-params"
import { EmpresaRow } from "@/components/superadmin/EmpresaRow"
import { PanelBox } from "@/components/superadmin/PanelBox"
import { PageHeader } from "@/components/shared/PageHeader"
import { AlertCircle, Building2, CheckCircle2, Plus, X } from "lucide-react"
import Link from "next/link"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import Typography from "@mui/material/Typography"
import { SearchInput } from "@/components/shared/SearchInput"

const successMessages: Record<string, string> = {
  empresa_creada:     "Empresa creada correctamente con su usuario RH inicial.",
  empresa_suspendida: "Empresa suspendida.",
  empresa_activada:   "Empresa reactivada correctamente.",
}
const errorMessages: Record<string, string> = {
  datos:      "Faltan datos obligatorios.",
  email_rh:   "Ese correo RH ya está ligado a una empresa.",
  usuario_rh: "Ese correo ya existe como usuario del portal.",
  empresa:    "No se encontró la empresa.",
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

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const PAGE_SIZE = 20

export default async function EmpresasPage({ searchParams }: PageProps) {
  const params       = await searchParams
  const success      = readSearchParam(params, "success")
  const error        = readSearchParam(params, "error")
  const q            = readSearchParam(params, "q")?.toLowerCase() ?? ""
  const statusFilter = readSearchParam(params, "status") ?? "all"
  const page         = Math.max(1, Number(readSearchParam(params, "page") ?? "1"))

  const { empresas } = await getSuperadminEmpresasSnapshot()

  const empresasFiltradas = empresas.filter((e) => {
    const matchQ =
      q
        ? e.nombre.toLowerCase().includes(q) ||
          (e.rfc?.toLowerCase().includes(q) ?? false) ||
          e.email_rh.toLowerCase().includes(q)
        : true
    const matchStatus =
      statusFilter === "activa"     ? e.activo  :
      statusFilter === "suspendida" ? !e.activo :
      true
    return matchQ && matchStatus
  })

  const totalPages     = Math.max(1, Math.ceil(empresasFiltradas.length / PAGE_SIZE))
  const currentPage    = Math.min(page, totalPages)
  const empresasPagina = empresasFiltradas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function pageUrl(p: number) {
    const qs = new URLSearchParams()
    if (q) qs.set("q", q)
    if (statusFilter !== "all") qs.set("status", statusFilter)
    if (p > 1) qs.set("page", String(p))
    const str = qs.toString()
    return `/superadmin/companies${str ? `?${str}` : ""}`
  }

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <PageHeader
        title="Empresas clientes"
        description="Gestiona las organizaciones activas en la plataforma."
        action={
          <Link href="/superadmin/companies/new" style={{ textDecoration: 'none' }}>
            <Button
              variant="contained"
              startIcon={<Plus size={14} strokeWidth={2.5} />}
              sx={{ height: 44, px: 3, borderRadius: '10px' }}
            >
              Nueva empresa
            </Button>
          </Link>
        }
      />

      {success && (
        <Alert severity="success" icon={<CheckCircle2 size={16} />} sx={{ borderRadius: 2, border: "1px solid #bbf7d0", bgcolor: "#f0fdf4", color: "#14532d" }}>
          {successMessages[success] ?? success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" icon={<AlertCircle size={16} />} sx={{ borderRadius: 2 }}>
          {errorMessages[error] ?? error}
        </Alert>
      )}

      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
        <Box component="form" method="GET" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          <SearchInput
            name="q"
            defaultValue={q}
            placeholder="Buscar empresa o RFC…"
            width={224}
          />
          <Box
            component="select"
            name="status"
            defaultValue={statusFilter}
            sx={{
              height: 40,
              borderRadius: '8px',
              border: '2px solid #CBD5E1',
              bgcolor: '#FFFFFF',
              px: 1.5,
              fontSize: '13px',
              color: '#1E293B',
              outline: 'none',
              cursor: 'pointer',
              '&:focus': { borderColor: '#8B5CF6', boxShadow: '3px 3px 0px 0px #8B5CF6' },
            }}
          >
            <option value="all">Todos</option>
            <option value="activa">Activas</option>
            <option value="suspendida">Suspendidas</option>
          </Box>
          <Button
            type="submit"
            variant="outlined"
            size="small"
            sx={{ bgcolor: '#FFFFFF', height: 40, px: 1.5, fontSize: 13, borderColor: "divider", color: "text.secondary" }}
          >
            Filtrar
          </Button>
          {(q || statusFilter !== "all") && (
            <Link
              href="/superadmin/companies"
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

      <PanelBox
        title="Empresas registradas"
        description={`${empresasFiltradas.length} resultado${empresasFiltradas.length !== 1 ? "s" : ""}${q || statusFilter !== "all" ? " · filtro activo" : ""}${totalPages > 1 ? ` · pág. ${currentPage}/${totalPages}` : ""}`}
        noPadding
      >
        {empresasFiltradas.length === 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, py: 8, textAlign: "center" }}>
            <Building2 size={28} style={{ color: "#cbd5e1" }} />
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              {q || statusFilter !== "all" ? "Sin resultados para ese filtro." : "Aún no hay empresas registradas."}
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={TH_SX}>Empresa</TableCell>
                <TableCell sx={{ ...TH_SX, display: { xs: "none", sm: "table-cell" } }}>RFC</TableCell>
                <TableCell sx={{ ...TH_SX, display: { xs: "none", md: "table-cell" } }}>Plan</TableCell>
                <TableCell sx={TH_SX}>Cupos</TableCell>
                <TableCell sx={{ ...TH_SX, display: { xs: "none", lg: "table-cell" } }}>Alta</TableCell>
                <TableCell sx={TH_SX}>Estado</TableCell>
                <TableCell sx={{ ...TH_SX, textAlign: "right" }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {empresasPagina.map((empresa) => (
                <EmpresaRow key={empresa.id} empresa={empresa} />
              ))}
            </TableBody>
          </Table>
        )}

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
              {empresasFiltradas.length} resultado{empresasFiltradas.length !== 1 ? "s" : ""} · página {currentPage} de {totalPages}
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
                <Button variant="outlined" size="small" disabled sx={{ height: 28, fontSize: 12 }}>
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
                <Button variant="outlined" size="small" disabled sx={{ height: 28, fontSize: 12 }}>
                  Siguiente →
                </Button>
              )}
            </Box>
          </Box>
        )}
      </PanelBox>
    </Box>
  )
}
