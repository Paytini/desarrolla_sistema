import { PaqueteCard } from "@/components/superadmin/PaqueteCard"
import { PanelBox } from "@/components/superadmin/PanelBox"
import { PageHeader } from "@/components/superadmin/PageHeader"
import { getSuperadminPaquetesSnapshot } from "@/lib/dashboard-cache"
import { readDecodedSearchParam, readSearchParam } from "@/lib/search-params"
import { AlertCircle, CheckCircle2, Package, Plus, RotateCw } from "lucide-react"
import Link from "next/link"
import {
  assignPackageToCompanyAction,
  syncPackageToCompanyEmployeesAction,
} from "./actions"
import Alert from "@mui/material/Alert"
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
  paquete_creado:   "El paquete se creó correctamente.",
  paquete_eliminado:"El paquete se eliminó del catálogo.",
  paquete_asignado: "El paquete activo de la empresa se actualizó correctamente.",
  sync_ok:          "Se sincronizaron los cursos con los empleados activos.",
}

const errorMessages: Record<string, string> = {
  paquete:          "No fue posible eliminar el paquete.",
  paquete_asignado: "No puedes eliminar un paquete activo en una empresa.",
  asignacion:       "No fue posible asignar el paquete.",
  sync:             "No fue posible sincronizar. Revisa que exista paquete activo y empleados con WP user ID.",
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
  borderRadius: '8px',
  border: '2px solid #CBD5E1',
  bgcolor: '#FFFFFF',
  px: 1,
  fontSize: 12,
  color: '#1E293B',
  outline: 'none',
  cursor: 'pointer',
  '&:focus': { borderColor: '#8B5CF6', boxShadow: '3px 3px 0px 0px #8B5CF6' },
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SuperAdminPaquetesPage({ searchParams }: PageProps) {
  const params  = await searchParams
  const success = readSearchParam(params, "success")
  const error   = readSearchParam(params, "error")
  const detail  = readDecodedSearchParam(params, "detail")

  const { paquetes, empresas, dc3MetadataByCourseId } = await getSuperadminPaquetesSnapshot()

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <PageHeader
        breadcrumb="SuperAdmin · Operaciones"
        title="Gestión de paquetes"
        description="Define paquetes con cursos de Tutor LMS, asígnalos a empresas y sincroniza empleados."
        accentColor="#8B5CF6"
        action={
          <Link href="/superadmin/paquetes/nuevo" style={{ textDecoration: "none" }}>
            <Button
              variant="contained"
              startIcon={<Plus size={14} strokeWidth={2.5} />}
              sx={{
                height: 44,
                px: 3,
                fontSize: "0.875rem",
                fontWeight: 700,
                letterSpacing: "0.02em",
                textTransform: "none",
                backgroundColor: "#F5853F",
                color: "#ffffff",
                border: "2px solid #1E293B",
                borderRadius: "9999px",
                boxShadow: "4px 4px 0px 0px #1E293B",
                "&:hover": {
                  backgroundColor: "#D96B20",
                  boxShadow: "6px 6px 0px 0px #1E293B",
                  transform: "translate(-2px,-2px)",
                },
                "&:active": {
                  boxShadow: "2px 2px 0px 0px #1E293B",
                  transform: "translate(2px,2px)",
                },
              }}
            >
              Nuevo paquete
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
          {detail ? `${errorMessages[error] ?? error} — ${detail}` : (errorMessages[error] ?? error)}
        </Alert>
      )}

      <PanelBox
        title="Catálogo de paquetes"
        description="Cursos por paquete, estado DC-3 y empresas asignadas."
        noPadding
      >
        {paquetes.length === 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, py: 8, textAlign: "center" }}>
            <Package size={28} style={{ color: "#cbd5e1" }} />
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Aún no hay paquetes registrados.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gap: 2, p: 2.5, gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" } }}>
            {paquetes.map((paquete) => (
              <PaqueteCard key={paquete.id} paquete={paquete} dc3MetadataByCourseId={dc3MetadataByCourseId} />
            ))}
          </Box>
        )}
      </PanelBox>

      <PanelBox
        title="Asignación por empresa"
        description="Asigna el paquete activo de cada empresa y sincroniza con sus empleados."
        noPadding
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={TH_SX}>Empresa</TableCell>
              <TableCell sx={TH_SX}>Paquete activo</TableCell>
              <TableCell sx={TH_SX}>Cambiar paquete</TableCell>
              <TableCell sx={{ ...TH_SX, display: { xs: "none", sm: "table-cell" } }}>Empleados</TableCell>
              <TableCell sx={{ ...TH_SX, textAlign: "right" }}>Sync</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {empresas.map((empresa) => {
              const activePackage = empresa.paquetes[0]?.paquete
              const syncable      = empresa.empleados.filter((e) => e.wp_user_id).length

              return (
                <TableRow key={empresa.id} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                  <TableCell sx={{ ...TD_SX, fontSize: 13, fontWeight: 500, color: "text.primary" }}>
                    {empresa.nombre}
                  </TableCell>
                  <TableCell sx={TD_SX}>
                    {activePackage ? (
                      <Chip
                        label={activePackage.nombre}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: 11, "& .MuiChip-label": { px: 1 } }}
                      />
                    ) : (
                      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Sin paquete</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={TD_SX}>
                    <Box
                      component="form"
                      action={assignPackageToCompanyAction}
                      sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}
                    >
                      <input type="hidden" name="empresa_id" value={empresa.id} />
                      <Box
                        component="select"
                        name="paquete_id"
                        required
                        aria-label="Paquete"
                        defaultValue={empresa.paquetes[0]?.paquete_id ?? ""}
                        sx={SELECT_SX}
                      >
                        <option value="" disabled>Selecciona un paquete</option>
                        {paquetes.map((p) => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </Box>
                      <Box
                        component="input"
                        type="date"
                        name="fecha_vencimiento"
                        aria-label="Fecha de vencimiento"
                        sx={SELECT_SX}
                      />
                      <Button
                        type="submit"
                        size="small"
                        variant="contained"
                        disableElevation
                        sx={{
                          height: 32,
                          px: 3,
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                          textTransform: 'none',
                          backgroundColor: '#F5853F',
                          color: '#ffffff',
                          border: '2px solid #1E293B',
                          borderRadius: '9999px',
                          boxShadow: '4px 4px 0px 0px #1E293B',
                          '&:hover': {
                            backgroundColor: '#D96B20',
                            boxShadow: '6px 6px 0px 0px #1E293B',
                            transform: 'translate(-2px,-2px)',
                          },
                          '&:active': {
                            boxShadow: '2px 2px 0px 0px #1E293B',
                            transform: 'translate(2px,2px)',
                          },
                        }}
                      >
                        Asignar
                      </Button>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ ...TD_SX, display: { xs: "none", sm: "table-cell" } }}>
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      {empresa.empleados.length} empleados · {syncable} con WP ID
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ ...TD_SX, textAlign: "right" }}>
                    <form action={syncPackageToCompanyEmployeesAction}>
                      <input type="hidden" name="empresa_id" value={empresa.id} />
                      <Button
                        variant="outlined"
                        size="small"
                        type="submit"
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
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </PanelBox>
    </Box>
  )
}
