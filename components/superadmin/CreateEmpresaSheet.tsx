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

import { PasswordToggleInput } from "@/components/superadmin/PasswordToggleInput"
import { SubmitButton } from "@/components/superadmin/SubmitButton"
import { createCompanyAction } from "@/app/(portal)/superadmin/empresas/actions"
import type { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"

type Paquete = Awaited<ReturnType<typeof getSuperadminEmpresasSnapshot>>["paquetes"][number]

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

export function CreateEmpresaSheet({
  paquetes,
  defaultOpen,
}: {
  paquetes: Paquete[]
  defaultOpen: boolean
}) {
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
        Nueva empresa
      </Button>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: 440 },
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
            Alta de empresa
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
            Crea la empresa y su usuario RH primario.
          </Typography>
        </Box>

        {/* Form */}
        <Box
          component="form"
          action={createCompanyAction}
          sx={{ flex: 1, overflowY: "auto", px: 3, py: 3, display: "grid", gap: 2.5 }}
        >
          {/* Nombre + Correo RH */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Box>
              <FieldLabel>Nombre *</FieldLabel>
              <TextField name="nombre" required placeholder="CEMEX S.A. de C.V." size="small" fullWidth />
            </Box>
            <Box>
              <FieldLabel>Correo RH *</FieldLabel>
              <TextField name="email_rh" type="email" required placeholder="rh@empresa.com" size="small" fullWidth />
            </Box>
          </Box>

          {/* Responsable + Password */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Box>
              <FieldLabel>Responsable RH *</FieldLabel>
              <TextField name="nombre_rh" required placeholder="María González" size="small" fullWidth />
            </Box>
            <Box>
              <FieldLabel>Password temporal *</FieldLabel>
              <PasswordToggleInput
                name="password_rh"
                minLength={8}
                required
                placeholder="Mín. 8 caracteres"
              />
            </Box>
          </Box>

          {/* Teléfono + RFC + Cupos */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
            <Box>
              <FieldLabel>Teléfono</FieldLabel>
              <TextField name="telefono" placeholder="55 1234 5678" size="small" fullWidth />
            </Box>
            <Box>
              <FieldLabel>RFC</FieldLabel>
              <TextField name="rfc" placeholder="XAXX010101000" size="small" fullWidth />
            </Box>
            <Box>
              <FieldLabel>Cupos *</FieldLabel>
              <TextField
                name="asientos_contratados"
                type="number"
                required
                defaultValue={25}
                slotProps={{ htmlInput: { min: 1 } }}
                size="small"
                fullWidth
              />
            </Box>
          </Box>

          {/* Paquete + Vigencia */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Box>
              <FieldLabel>Paquete inicial</FieldLabel>
              <TextField
                name="paquete_id"
                select
                defaultValue=""
                size="small"
                fullWidth
              >
                <MenuItem value="">Sin asignar</MenuItem>
                {paquetes.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nombre}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box>
              <FieldLabel>Vigencia</FieldLabel>
              <TextField name="fecha_vencimiento" type="date" size="small" fullWidth />
            </Box>
          </Box>

          {/* Notas */}
          <Box>
            <FieldLabel>Notas internas</FieldLabel>
            <TextField
              name="notas"
              multiline
              rows={2}
              placeholder="Observaciones o notas del contrato…"
              size="small"
              fullWidth
            />
          </Box>

          <Divider />

          <SubmitButton
            fullWidth
            variant="contained"
            sx={{ bgcolor: "#F5853F", color: "#000022", "&:hover": { bgcolor: "#D96B20" } }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Crear empresa
          </SubmitButton>
        </Box>
      </Drawer>
    </>
  )
}
