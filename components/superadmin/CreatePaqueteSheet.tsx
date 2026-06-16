"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Divider from "@mui/material/Divider"
import Drawer from "@mui/material/Drawer"
import MenuItem from "@mui/material/MenuItem"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"

import { SubmitButton } from "@/components/superadmin/SubmitButton"
import PackageCourseSelector from "@/components/empresa/PackageCourseSelector"
import { createPackageAction } from "@/app/(portal)/superadmin/paquetes/actions"

const LABEL_SX = {
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  color: "#94a3b8",
  mb: 0.75,
  display: "block",
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Typography sx={LABEL_SX}>{children}</Typography>
}

export function CreatePaqueteSheet({ defaultOpen }: { defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <>
      <Button
        variant="contained"
        startIcon={<Plus size={14} strokeWidth={2.5} />}
        onClick={() => setOpen(true)}
        sx={{
          height: 36,
          px: 2,
          fontSize: 13,
          fontWeight: 600,
          bgcolor: "#F5853F",
          color: "#000022",
          boxShadow: "0 4px 14px -4px rgba(245,133,63,0.5)",
          "&:hover": {
            bgcolor: "#D96B20",
            boxShadow: "0 6px 18px -4px rgba(245,133,63,0.6)",
            transform: "translateY(-1px)",
          },
          transition: "all 0.15s ease",
        }}
      >
        Nuevo paquete
      </Button>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: 520 },
              bgcolor: "background.paper",
              borderLeft: "1px solid",
              borderColor: "divider",
            },
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 3, py: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16 }}>
            Nuevo paquete
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
            Define un paquete con cursos de Tutor LMS y, opcionalmente, un bundle privado.
          </Typography>
        </Box>

        {/* Form */}
        <Box
          component="form"
          action={createPackageAction}
          sx={{ flex: 1, overflowY: "auto", px: 3, py: 3, display: "grid", gap: 2.5 }}
        >
          {/* Nombre */}
          <Box>
            <FieldLabel>Nombre del paquete *</FieldLabel>
            <TextField
              name="nombre"
              required
              placeholder="Ej: Paquete Seguridad Industrial"
              size="small"
              fullWidth
            />
          </Box>

          {/* Descripción */}
          <Box>
            <FieldLabel>Descripción</FieldLabel>
            <TextField
              name="descripcion"
              multiline
              rows={2}
              placeholder="Descripción del paquete…"
              size="small"
              fullWidth
            />
          </Box>

          {/* Modo de entrega */}
          <Box>
            <FieldLabel>Modo de entrega B2B</FieldLabel>
            <TextField
              name="modo_entrega"
              select
              defaultValue="DIRECT_ENROLLMENT"
              size="small"
              fullWidth
            >
              <MenuItem value="DIRECT_ENROLLMENT">
                Matrícula directa por curso (Recomendado)
              </MenuItem>
              <MenuItem value="PRIVATE_BUNDLE_REFERENCE">
                Bundle privado como referencia operativa
              </MenuItem>
            </TextField>
          </Box>

          {/* WP Bundle ID + Nombre bundle */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Box>
              <FieldLabel>WP Bundle ID</FieldLabel>
              <TextField
                name="wp_bundle_id"
                type="number"
                placeholder="Opcional"
                slotProps={{ htmlInput: { min: 1 } }}
                size="small"
                fullWidth
              />
            </Box>
            <Box>
              <FieldLabel>Nombre del bundle</FieldLabel>
              <TextField
                name="nombre_bundle"
                placeholder="Auto si se crea desde el portal"
                size="small"
                fullWidth
              />
            </Box>
          </Box>

          {/* Info */}
          <Box
            sx={{
              borderRadius: "8px",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.default",
              px: 2,
              py: 1.5,
              fontSize: 12,
              lineHeight: 1.6,
              color: "text.secondary",
            }}
          >
            Si dejas vacío <strong>WP Bundle ID</strong>, el portal intentará crear un bundle
            privado en Tutor LMS.
          </Box>

          {/* Notas operativas */}
          <Box>
            <FieldLabel>Notas operativas</FieldLabel>
            <TextField name="notas_operativas" multiline rows={2} size="small" fullWidth />
          </Box>

          {/* Cursos */}
          <Box>
            <FieldLabel>Cursos del paquete *</FieldLabel>
            <PackageCourseSelector />
          </Box>

          <Divider />

          <SubmitButton
            fullWidth
            variant="contained"
            sx={{ bgcolor: "#F5853F", color: "#000022", "&:hover": { bgcolor: "#D96B20" } }}
          >
            Guardar paquete
          </SubmitButton>
        </Box>
      </Drawer>
    </>
  )
}
