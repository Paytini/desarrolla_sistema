import Link from "next/link"
import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import { BookOpen, Building2, CheckCircle2, CircleAlert, ExternalLink } from "lucide-react"

import DeletePackageButton from "@/components/superadmin/DeletePackageButton"
import { deletePackageAction } from "@/app/(portal)/superadmin/paquetes/actions"
import { getDc3MissingFields, type Dc3MetadataView } from "@/lib/dc3"
import type { getSuperadminPaquetesSnapshot } from "@/lib/dashboard-cache"
import { decodeHtmlEntities, formatDate } from "@/lib/format"

type Paquete             = Awaited<ReturnType<typeof getSuperadminPaquetesSnapshot>>["paquetes"][number]
type Dc3MetadataByCourseId = Awaited<ReturnType<typeof getSuperadminPaquetesSnapshot>>["dc3MetadataByCourseId"]

export function PaqueteCard({
  paquete,
  dc3MetadataByCourseId,
}: {
  paquete: Paquete
  dc3MetadataByCourseId: Dc3MetadataByCourseId
}) {
  const dc3Complete = paquete.cursos.filter((c) => {
    const meta = dc3MetadataByCourseId[String(c.wp_curso_id)] as Dc3MetadataView | undefined
    return getDc3MissingFields(meta).length === 0
  }).length
  const dc3Total  = paquete.cursos.length
  const dc3AllOk  = dc3Total > 0 && dc3Complete === dc3Total
  const empresas  = paquete.empresas.map((e) => e.empresa.nombre)

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "14px",
        border: "1px solid #E2E8F0",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.15s ease",
        "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,0.07)" },
      }}
    >
      {/* ── Header ───────────────────────────── */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1.75, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
            {paquete.nombre}
          </Typography>
          {paquete.descripcion && (
            <Typography
              sx={{
                mt: 0.5,
                fontSize: 12,
                color: "#64748b",
                lineHeight: 1.55,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {paquete.descripcion}
            </Typography>
          )}
        </Box>
        <DeletePackageButton
          action={deletePackageAction}
          paqueteId={paquete.id}
          packageName={paquete.nombre}
          assignedCompaniesCount={paquete.empresas.length}
        />
      </Box>

      {/* ── Stats chips ──────────────────────── */}
      <Box sx={{ px: 2.5, pb: 2, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        <Chip
          icon={<BookOpen size={11} />}
          label={`${dc3Total} curso${dc3Total !== 1 ? "s" : ""}`}
          size="small"
          sx={{
            height: 24, fontSize: 11,
            bgcolor: "#f1f5f9", color: "#475569",
            "& .MuiChip-icon": { color: "#94a3b8", ml: 0.75 },
            "& .MuiChip-label": { px: 1 },
          }}
        />
        <Chip
          icon={<Building2 size={11} />}
          label={empresas.length > 0 ? empresas.join(", ") : "Sin asignar"}
          size="small"
          sx={{
            height: 24, fontSize: 11, maxWidth: 220,
            bgcolor: empresas.length > 0 ? "#f0fdf4" : "#f8fafc",
            color: empresas.length > 0 ? "#15803d" : "#94a3b8",
            "& .MuiChip-icon": { color: empresas.length > 0 ? "#22c55e" : "#94a3b8", ml: 0.75 },
            "& .MuiChip-label": { px: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
          }}
        />
        {dc3Total > 0 && (
          <Chip
            icon={dc3AllOk ? <CheckCircle2 size={11} /> : <CircleAlert size={11} />}
            label={dc3AllOk ? "DC-3 completo" : `DC-3 ${dc3Complete}/${dc3Total}`}
            size="small"
            sx={{
              height: 24, fontSize: 11,
              bgcolor: dc3AllOk ? "#f0fdf4" : "#fffbeb",
              color: dc3AllOk ? "#15803d" : "#b45309",
              "& .MuiChip-icon": { color: dc3AllOk ? "#22c55e" : "#f59e0b", ml: 0.75 },
              "& .MuiChip-label": { px: 1 },
            }}
          />
        )}
      </Box>

      {/* ── Notas operativas ─────────────────── */}
      {paquete.notas_operativas && (
        <Box
          sx={{
            mx: 2.5,
            mb: 2,
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

      {/* ── Course list ──────────────────────── */}
      {paquete.cursos.length > 0 && (
        <Box sx={{ flex: 1, borderTop: "1px solid #f1f5f9" }}>
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
                  px: 2.5,
                  py: 1.1,
                  borderBottom: index < paquete.cursos.length - 1 ? "1px solid #f8fafc" : "none",
                  transition: "background-color 0.1s ease",
                  "&:hover": { bgcolor: "#fafafa" },
                }}
              >
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    flexShrink: 0,
                    bgcolor: isDc3Ready ? "#22c55e" : "#fbbf24",
                  }}
                />
                <Typography
                  sx={{
                    flex: 1,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#334155",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {decodeHtmlEntities(curso.nombre_curso ?? "")}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: isDc3Ready ? "#15803d" : "#b45309",
                    }}
                  >
                    {isDc3Ready ? "DC-3 ✓" : `${missingCount} pendiente${missingCount !== 1 ? "s" : ""}`}
                  </Typography>
                  <Link
                    href={`/superadmin/dc3?open=${curso.wp_curso_id}`}
                    style={{ display: "flex", color: "#cbd5e1", lineHeight: 0 }}
                  >
                    <ExternalLink size={12} />
                  </Link>
                </Box>
              </Box>
            )
          })}
        </Box>
      )}

      {/* ── Footer ───────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2.5,
          py: 1.25,
          bgcolor: "#f8fafc",
          borderTop: "1px solid #f1f5f9",
          mt: "auto",
        }}
      >
        <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>
          {paquete.modo_entrega === "PRIVATE_BUNDLE_REFERENCE" ? "Bundle privado" : "Matrícula directa"}
          {paquete.wp_bundle_id ? ` · WP #${paquete.wp_bundle_id}` : ""}
        </Typography>
        <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>
          {formatDate(paquete.created_at)}
        </Typography>
      </Box>
    </Paper>
  )
}
