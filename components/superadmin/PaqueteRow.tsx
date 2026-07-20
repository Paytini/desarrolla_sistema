"use client"

import { useState } from "react"
import Link from "next/link"
import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import Collapse from "@mui/material/Collapse"
import IconButton from "@mui/material/IconButton"
import TableCell from "@mui/material/TableCell"
import TableRow from "@mui/material/TableRow"
import Typography from "@mui/material/Typography"
import { alpha } from "@mui/material/styles"
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ExternalLink,
} from "lucide-react"

import DeletePackageButton from "@/components/superadmin/DeletePackageButton"
import { deletePackageAction } from "@/app/(portal)/superadmin/packages/actions"
import { getDc3MissingFields, type Dc3MetadataView } from "@/lib/dc3"
import type { getSuperadminPaquetesSnapshot } from "@/lib/dashboard-cache"
import { decodeHtmlEntities, formatDate } from "@/lib/format"

export type Paquete = Awaited<ReturnType<typeof getSuperadminPaquetesSnapshot>>["paquetes"][number]
export type Dc3MetadataByCourseId = Awaited<ReturnType<typeof getSuperadminPaquetesSnapshot>>["dc3MetadataByCourseId"]

const TD_SX = { borderBottom: "1px solid", borderColor: "divider" }

export function PaqueteRow({
  paquete,
  dc3Complete,
  dc3Total,
  dc3AllOk,
  empresasNombres,
  dc3MetadataByCourseId,
}: {
  paquete: Paquete
  dc3Complete: number
  dc3Total: number
  dc3AllOk: boolean
  empresasNombres: string[]
  dc3MetadataByCourseId: Dc3MetadataByCourseId
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TableRow
        onClick={() => setOpen((v) => !v)}
        sx={{ cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
      >
        <TableCell sx={{ ...TD_SX, width: 32, pr: 0 }}>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </IconButton>
        </TableCell>
        <TableCell sx={TD_SX}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
            {paquete.nombre}
          </Typography>
          {paquete.descripcion && (
            <Typography
              sx={{
                mt: 0.25,
                fontSize: 11.5,
                color: "text.secondary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 360,
              }}
            >
              {paquete.descripcion}
            </Typography>
          )}
        </TableCell>
        <TableCell sx={{ ...TD_SX, display: { xs: "none", sm: "table-cell" } }}>
          <Chip
            icon={<BookOpen size={11} />}
            label={`${dc3Total} curso${dc3Total !== 1 ? "s" : ""}`}
            size="small"
            sx={{
              height: 22, fontSize: 11,
              bgcolor: "action.hover", color: "text.secondary",
              "& .MuiChip-icon": { color: "text.disabled", ml: 0.75 },
              "& .MuiChip-label": { px: 1 },
            }}
          />
        </TableCell>
        <TableCell sx={{ ...TD_SX, display: { xs: "none", md: "table-cell" } }}>
          <Chip
            icon={<Building2 size={11} />}
            label={empresasNombres.length > 0 ? empresasNombres.join(", ") : "Sin asignar"}
            size="small"
            sx={{
              height: 22, fontSize: 11, maxWidth: 220,
              bgcolor: empresasNombres.length > 0 ? (theme) => alpha(theme.palette.primary.main, 0.08) : "action.hover",
              color: empresasNombres.length > 0 ? "primary.main" : "text.disabled",
              "& .MuiChip-icon": { color: "inherit", ml: 0.75 },
              "& .MuiChip-label": { px: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
            }}
          />
        </TableCell>
        <TableCell sx={TD_SX}>
          {dc3Total > 0 ? (
            <Chip
              icon={dc3AllOk ? <CheckCircle2 size={11} /> : <CircleAlert size={11} />}
              label={dc3AllOk ? "Completo" : `${dc3Complete}/${dc3Total}`}
              size="small"
              sx={{
                height: 22, fontSize: 11,
                bgcolor: dc3AllOk ? "action.hover" : "#fffbeb",
                color: dc3AllOk ? "text.secondary" : "#b45309",
                "& .MuiChip-icon": { color: dc3AllOk ? "text.disabled" : "#f59e0b", ml: 0.75 },
                "& .MuiChip-label": { px: 1 },
              }}
            />
          ) : (
            <Typography sx={{ fontSize: 11, color: "text.disabled" }}>Sin cursos</Typography>
          )}
        </TableCell>
        <TableCell sx={{ ...TD_SX, display: { xs: "none", lg: "table-cell" } }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            {formatDate(paquete.created_at)}
          </Typography>
        </TableCell>
        <TableCell sx={{ ...TD_SX, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
          <DeletePackageButton
            action={deletePackageAction}
            paqueteId={paquete.id}
            packageName={paquete.nombre}
            assignedCompaniesCount={paquete.empresas.length}
          />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell sx={{ p: 0, borderBottom: open ? "1px solid" : "none", borderColor: "divider" }} colSpan={7}>
          <Collapse in={open} timeout={160} unmountOnExit>
            <Box sx={{ bgcolor: "action.hover", px: 2, py: 1.5 }}>
              {paquete.notas_operativas && (
                <Box
                  sx={{
                    mb: 1.5,
                    borderRadius: "8px",
                    border: "1px solid #fde68a",
                    bgcolor: "#fffbeb",
                    px: 1.5,
                    py: 1,
                    fontSize: 12,
                    color: "#78350f",
                    lineHeight: 1.5,
                  }}
                >
                  {paquete.notas_operativas}
                </Box>
              )}

              <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "text.disabled", mb: 0.75 }}>
                Cursos y estado DC-3
              </Typography>

              {paquete.cursos.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: "text.secondary", py: 1 }}>
                  Este paquete no tiene cursos asignados.
                </Typography>
              ) : (
                <Box sx={{ borderRadius: "10px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", overflow: "hidden" }}>
                  {paquete.cursos.map((curso, index) => {
                    const dc3Metadata  = dc3MetadataByCourseId[String(curso.wp_curso_id)] as Dc3MetadataView | undefined
                    const missingCount = getDc3MissingFields(dc3Metadata).length
                    const isDc3Ready   = missingCount === 0

                    return (
                      <Box
                        key={curso.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          px: 1.75,
                          py: 1,
                          borderBottom: index < paquete.cursos.length - 1 ? "1px solid" : "none",
                          borderColor: "divider",
                        }}
                      >
                        <Box
                          sx={{
                            width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                            bgcolor: isDc3Ready ? "primary.main" : "#fbbf24",
                          }}
                        />
                        <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 500, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                          {decodeHtmlEntities(curso.nombre_curso ?? "")}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                          <Typography sx={{ fontSize: 10, fontWeight: 600, color: isDc3Ready ? "text.secondary" : "#b45309" }}>
                            {isDc3Ready ? "DC-3 ✓" : `${missingCount} pendiente${missingCount !== 1 ? "s" : ""}`}
                          </Typography>
                          <Link href={`/superadmin/dc3?open=${curso.wp_curso_id}`} style={{ display: "flex", color: "#cbd5e1", lineHeight: 0 }}>
                            <ExternalLink size={12} />
                          </Link>
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              )}

              <Typography sx={{ fontSize: 11, color: "text.disabled", mt: 1.25 }}>
                {paquete.modo_entrega === "PRIVATE_BUNDLE_REFERENCE" ? "Bundle privado" : "Matrícula directa"}
                {paquete.wp_bundle_id ? ` · WP #${paquete.wp_bundle_id}` : ""}
              </Typography>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}
