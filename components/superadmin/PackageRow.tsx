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
  Pencil,
} from "lucide-react"

import DeletePackageButton from "@/components/superadmin/DeletePackageButton"
import { deletePackageAction } from "@/app/(portal)/superadmin/packages/actions"
import { getDc3MissingFields, type Dc3MetadataView } from "@/lib/dc3"
import type { getSuperadminPackagesSnapshot } from "@/lib/dashboard-cache"
import { decodeHtmlEntities, formatDate } from "@/lib/format"

export type Package = Awaited<ReturnType<typeof getSuperadminPackagesSnapshot>>["paquetes"][number]
export type Dc3MetadataByCourseId = Awaited<ReturnType<typeof getSuperadminPackagesSnapshot>>["dc3MetadataByCourseId"]

const TD_SX = { borderBottom: "1px solid", borderColor: "divider" }

export function PackageRow({
  pkg,
  dc3Complete,
  dc3Total,
  dc3AllOk,
  companyNames,
  dc3MetadataByCourseId,
}: {
  pkg: Package
  dc3Complete: number
  dc3Total: number
  dc3AllOk: boolean
  companyNames: string[]
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
            {pkg.name}
          </Typography>
          {pkg.description && (
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
              {pkg.description}
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
            label={companyNames.length > 0 ? companyNames.join(", ") : "Sin asignar"}
            size="small"
            sx={{
              height: 22, fontSize: 11, maxWidth: 220,
              bgcolor: companyNames.length > 0 ? (theme) => alpha(theme.palette.primary.main, 0.08) : "action.hover",
              color: companyNames.length > 0 ? "primary.main" : "text.disabled",
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
            {formatDate(pkg.created_at)}
          </Typography>
        </TableCell>
        <TableCell sx={{ ...TD_SX, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
            <Link href={`/superadmin/packages/${pkg.id}/edit`}>
              <IconButton size="small" sx={{ color: "text.secondary" }} aria-label="Editar paquete">
                <Pencil size={14} />
              </IconButton>
            </Link>
            <DeletePackageButton
              action={deletePackageAction}
              packageId={pkg.id}
              packageName={pkg.name}
              assignedCompaniesCount={pkg.companies.length}
            />
          </Box>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell sx={{ p: 0, borderBottom: open ? "1px solid" : "none", borderColor: "divider" }} colSpan={7}>
          <Collapse in={open} timeout={160} unmountOnExit>
            <Box sx={{ bgcolor: "action.hover", px: 2, py: 1.5 }}>
              {pkg.operational_notes && (
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
                  {pkg.operational_notes}
                </Box>
              )}

              <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "text.disabled", mb: 0.75 }}>
                Cursos y estado DC-3
              </Typography>

              {pkg.courses.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: "text.secondary", py: 1 }}>
                  Este paquete no tiene cursos asignados.
                </Typography>
              ) : (
                <Box sx={{ borderRadius: "10px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", overflow: "hidden" }}>
                  {pkg.courses.map((course, index) => {
                    const dc3Metadata  = dc3MetadataByCourseId[String(course.wp_course_id)] as Dc3MetadataView | undefined
                    const missingCount = getDc3MissingFields(dc3Metadata).length
                    const isDc3Ready   = missingCount === 0

                    return (
                      <Box
                        key={course.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          px: 1.75,
                          py: 1,
                          borderBottom: index < pkg.courses.length - 1 ? "1px solid" : "none",
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
                          {decodeHtmlEntities(course.course_name ?? "")}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                          <Typography sx={{ fontSize: 10, fontWeight: 600, color: isDc3Ready ? "text.secondary" : "#b45309" }}>
                            {isDc3Ready ? "DC-3 ✓" : `${missingCount} pendiente${missingCount !== 1 ? "s" : ""}`}
                          </Typography>
                          <Link href={`/superadmin/dc3?open=${course.wp_course_id}`} style={{ display: "flex", color: "#cbd5e1", lineHeight: 0 }}>
                            <ExternalLink size={12} />
                          </Link>
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              )}

              <Typography sx={{ fontSize: 11, color: "text.disabled", mt: 1.25 }}>
                {pkg.delivery_mode === "PRIVATE_BUNDLE_REFERENCE" ? "Bundle privado" : "Matrícula directa"}
                {pkg.wp_bundle_id ? ` · WP #${pkg.wp_bundle_id}` : ""}
              </Typography>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}
