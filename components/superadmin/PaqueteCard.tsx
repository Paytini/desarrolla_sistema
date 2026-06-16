import Link from "next/link"
import Accordion from "@mui/material/Accordion"
import AccordionDetails from "@mui/material/AccordionDetails"
import AccordionSummary from "@mui/material/AccordionSummary"
import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import { ChevronDown } from "lucide-react"

import DeletePackageButton from "@/components/superadmin/DeletePackageButton"
import { deletePackageAction } from "@/app/(portal)/superadmin/paquetes/actions"
import { getDc3MissingFields, type Dc3MetadataView } from "@/lib/dc3"
import type { getSuperadminPaquetesSnapshot } from "@/lib/dashboard-cache"
import { decodeHtmlEntities, formatDate } from "@/lib/format"

type Paquete = Awaited<ReturnType<typeof getSuperadminPaquetesSnapshot>>["paquetes"][number]
type Dc3MetadataByCourseId = Awaited<ReturnType<typeof getSuperadminPaquetesSnapshot>>["dc3MetadataByCourseId"]

export function PaqueteCard({
  paquete,
  dc3MetadataByCourseId,
}: {
  paquete: Paquete
  dc3MetadataByCourseId: Dc3MetadataByCourseId
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        p: 2.5,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: "text.primary" }}>
            {paquete.nombre}
          </Typography>
          <Chip
            label={`${paquete.cursos.length} curso${paquete.cursos.length === 1 ? "" : "s"}`}
            size="small"
            sx={{
              mt: 1,
              height: 20,
              fontSize: "11px",
              bgcolor: "action.hover",
              color: "text.secondary",
              "& .MuiChip-label": { px: 1 },
            }}
          />
        </Box>
        <DeletePackageButton
          action={deletePackageAction}
          paqueteId={paquete.id}
          packageName={paquete.nombre}
          assignedCompaniesCount={paquete.empresas.length}
        />
      </Box>

      {/* Descripción */}
      {paquete.descripcion && (
        <Typography variant="body2" sx={{ mt: 1.5, color: "text.secondary" }}>
          {paquete.descripcion}
        </Typography>
      )}

      {/* Meta */}
      <Typography sx={{ mt: 1.5, fontSize: 12, color: "text.secondary" }}>
        Modo:{" "}
        {paquete.modo_entrega === "PRIVATE_BUNDLE_REFERENCE"
          ? "Bundle privado"
          : "Matrícula directa"}
        {" · "}
        Empresas:{" "}
        {paquete.empresas.length > 0
          ? paquete.empresas.map((i) => i.empresa.nombre).join(", ")
          : "Ninguna"}
        {" · "}
        Creado: {formatDate(paquete.created_at)}
        {paquete.wp_bundle_id ? ` · Bundle WP: ${paquete.wp_bundle_id}` : ""}
      </Typography>

      {/* Notas operativas */}
      {paquete.notas_operativas && (
        <Box
          sx={{
            mt: 2,
            borderRadius: "8px",
            border: "1px solid #fde68a",
            bgcolor: "#fffbeb",
            px: 1.75,
            py: 1.25,
            fontSize: 13,
            color: "#78350f",
          }}
        >
          <strong>Notas:</strong> {paquete.notas_operativas}
        </Box>
      )}

      {/* Cursos */}
      {paquete.cursos.length > 0 && (
        <Box sx={{ mt: 2.5, display: "grid", gap: 1 }}>
          {paquete.cursos.map((curso) => {
            const dc3Metadata = dc3MetadataByCourseId[
              String(curso.wp_curso_id)
            ] as Dc3MetadataView | undefined
            const missingFields = getDc3MissingFields(dc3Metadata)
            const isDc3Ready = missingFields.length === 0

            return (
              <Accordion
                key={curso.id}
                elevation={0}
                disableGutters
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "8px !important",
                  bgcolor: "background.default",
                  "&::before": { display: "none" },
                  "&.Mui-expanded": { borderColor: "divider" },
                }}
              >
                <AccordionSummary
                  expandIcon={<ChevronDown size={14} strokeWidth={2} style={{ color: "#858382" }} />}
                  sx={{
                    minHeight: "auto",
                    px: 1.75,
                    py: 1,
                    "& .MuiAccordionSummary-content": { my: 0, alignItems: "center", gap: 1.5, justifyContent: "space-between" },
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>
                      {curso.wp_curso_id} — {decodeHtmlEntities(curso.nombre_curso ?? "")}
                    </Typography>
                    <Typography sx={{ mt: 0.25, fontSize: 12, color: "text.secondary" }}>
                      {isDc3Ready
                        ? "DC-3 listo: toda la metadata está completa."
                        : `Faltan: ${missingFields.join(", ")}`}
                    </Typography>
                  </Box>
                  <Chip
                    label={isDc3Ready ? "DC-3 completo" : "DC-3 pendiente"}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "10px",
                      fontWeight: 600,
                      flexShrink: 0,
                      border: "1px solid",
                      borderColor: isDc3Ready ? "#bbf7d0" : "#fde68a",
                      bgcolor: isDc3Ready ? "#f0fdf4" : "#fffbeb",
                      color: isDc3Ready ? "#15803d" : "#b45309",
                      "& .MuiChip-label": { px: 1 },
                    }}
                  />
                </AccordionSummary>
                <AccordionDetails sx={{ px: 1.75, pt: 0, pb: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography sx={{ mt: 1, fontSize: 12, color: "text.secondary", lineHeight: 1.6 }}>
                    Fuente: <strong>{dc3Metadata?.fuente ?? "Sin capturar"}</strong>
                    {" · "}
                    Sync:{" "}
                    <strong>
                      {dc3Metadata?.ultima_sincronizacion
                        ? formatDate(dc3Metadata.ultima_sincronizacion)
                        : "Nunca"}
                    </strong>
                  </Typography>
                  <Box
                    component={Link}
                    href="/superadmin/dc3"
                    sx={{
                      display: "inline-block",
                      mt: 0.75,
                      fontSize: 12,
                      color: "primary.main",
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    Editar en DC-3 →
                  </Box>
                </AccordionDetails>
              </Accordion>
            )
          })}
        </Box>
      )}
    </Paper>
  )
}
