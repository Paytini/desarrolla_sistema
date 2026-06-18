"use client"

import { useActionState, useRef, useState } from "react"
import { Building2, Package, UserRound } from "lucide-react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import MenuItem from "@mui/material/MenuItem"
import Step from "@mui/material/Step"
import StepLabel from "@mui/material/StepLabel"
import Stepper from "@mui/material/Stepper"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"

import { createCompanyAction } from "@/app/(portal)/superadmin/empresas/actions"
import { PasswordToggleInput } from "@/components/superadmin/PasswordToggleInput"
import type { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"

type Paquete = Awaited<ReturnType<typeof getSuperadminEmpresasSnapshot>>["paquetes"][number]

const STEPS = [
  { label: "Info empresa", Icon: Building2 },
  { label: "Admin RH",    Icon: UserRound  },
  { label: "Plan",        Icon: Package    },
]

const ERROR_MESSAGES: Record<string, string> = {
  datos:      "Faltan datos obligatorios.",
  email_rh:   "Ese correo ya está ligado a otra empresa.",
  usuario_rh: "Ese correo ya existe como usuario del portal.",
}

const LABEL_SX = {
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  color: "#94a3b8",
  mb: 0.75,
  display: "block",
}

export function CreateEmpresaWizard({ paquetes }: { paquetes: Paquete[] }) {
  const [step, setStep]                    = useState(0)
  const [state, formAction, pending]       = useActionState(createCompanyAction, null)
  const formRef                            = useRef<HTMLFormElement>(null)

  function validateCurrentStep(): boolean {
    if (!formRef.current) return true
    const requiredByStep: Record<number, string[]> = {
      0: ["nombre"],
      1: ["email_rh", "nombre_rh", "password_rh"],
    }
    for (const name of requiredByStep[step] ?? []) {
      const el = formRef.current.elements.namedItem(name) as HTMLInputElement | null
      if (el && !el.checkValidity()) {
        el.reportValidity()
        return false
      }
    }
    return true
  }

  function readField(name: string): string {
    if (!formRef.current) return ""
    const el = formRef.current.elements.namedItem(name) as HTMLInputElement | null
    return el?.value ?? ""
  }

  function handleNext() {
    if (validateCurrentStep()) setStep((s) => s + 1)
  }

  const isRhError = state?.error === "email_rh" || state?.error === "usuario_rh"

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <Stepper activeStep={step} sx={{ mb: 5 }}>
        {STEPS.map(({ label }) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box
        component="form"
        ref={formRef}
        action={formAction}
        noValidate
      >

        {/* ── Paso 0: Info empresa ─────────────────────────────────────── */}
        <Box sx={{ display: step === 0 ? "grid" : "none", gap: 2.5 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Box>
              <Typography component="label" sx={LABEL_SX}>Nombre *</Typography>
              <TextField
                name="nombre"
                required
                placeholder="CEMEX S.A. de C.V."
                size="small"
                fullWidth
              />
            </Box>
            <Box>
              <Typography component="label" sx={LABEL_SX}>RFC</Typography>
              <TextField
                name="rfc"
                placeholder="XAXX010101000"
                size="small"
                fullWidth
              />
            </Box>
          </Box>
          <Box sx={{ maxWidth: 320 }}>
            <Typography component="label" sx={LABEL_SX}>Teléfono</Typography>
            <TextField
              name="telefono"
              placeholder="55 1234 5678"
              size="small"
              fullWidth
            />
          </Box>
        </Box>

        {/* ── Paso 1: Admin RH ─────────────────────────────────────────── */}
        <Box sx={{ display: step === 1 ? "grid" : "none", gap: 2.5 }}>
          {state?.error === "datos" && (
            <Alert severity="error">{ERROR_MESSAGES.datos}</Alert>
          )}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Box>
              <Typography component="label" sx={LABEL_SX}>Correo RH *</Typography>
              <TextField
                name="email_rh"
                type="email"
                required
                placeholder="rh@empresa.com"
                size="small"
                fullWidth
                error={isRhError}
                helperText={isRhError ? ERROR_MESSAGES[state!.error] : undefined}
              />
            </Box>
            <Box>
              <Typography component="label" sx={LABEL_SX}>Nombre completo *</Typography>
              <TextField
                name="nombre_rh"
                required
                placeholder="María González"
                size="small"
                fullWidth
              />
            </Box>
          </Box>
          <Box sx={{ maxWidth: 320 }}>
            <Typography component="label" sx={LABEL_SX}>Contraseña temporal *</Typography>
            <PasswordToggleInput
              name="password_rh"
              minLength={8}
              required
              placeholder="Mín. 8 caracteres"
            />
          </Box>
        </Box>

        {/* ── Paso 2: Plan + resumen ───────────────────────────────────── */}
        <Box
          sx={{
            display: step === 2 ? "grid" : "none",
            gridTemplateColumns: { xs: "1fr", md: "1fr 260px" },
            gap: 3,
          }}
        >
          {/* Campos del plan */}
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Typography component="label" sx={LABEL_SX}>Cupos *</Typography>
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
              <Box>
                <Typography component="label" sx={LABEL_SX}>Paquete inicial</Typography>
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
            </Box>
            <Box sx={{ maxWidth: 220 }}>
              <Typography component="label" sx={LABEL_SX}>Vigencia</Typography>
              <TextField name="fecha_vencimiento" type="date" size="small" fullWidth />
            </Box>
            <Box>
              <Typography component="label" sx={LABEL_SX}>Notas internas</Typography>
              <TextField
                name="notas"
                multiline
                rows={3}
                placeholder="Observaciones del contrato…"
                size="small"
                fullWidth
              />
            </Box>
          </Box>

          {/* Card de resumen */}
          <Box
            sx={{
              bgcolor: "action.hover",
              border: "1px solid",
              borderColor: "divider",
              p: 2.5,
              alignSelf: "start",
            }}
          >
            <Typography
              sx={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "text.secondary",
                mb: 2,
              }}
            >
              Resumen
            </Typography>
            {[
              { label: "Empresa",  field: "nombre"    },
              { label: "RFC",      field: "rfc"       },
              { label: "Teléfono", field: "telefono"  },
              { label: "Email RH", field: "email_rh"  },
              { label: "Admin RH", field: "nombre_rh" },
            ].map(({ label, field }) => (
              <Box key={field} sx={{ mb: 1.5 }}>
                <Typography sx={{ fontSize: 10, color: "text.secondary" }}>{label}</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>
                  {readField(field) || "—"}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Navegación ───────────────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 5,
            pt: 3,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Button
            onClick={() => setStep((s) => s - 1)}
            variant="outlined"
            sx={{
              borderColor: "divider",
              color: "text.secondary",
              visibility: step === 0 ? "hidden" : "visible",
            }}
          >
            ← Atrás
          </Button>

          {step < 2 ? (
            <Button
              type="button"
              onClick={handleNext}
              variant="contained"
              sx={{
                bgcolor: "#F5853F",
                color: "#000022",
                "&:hover": { bgcolor: "#D96B20" },
              }}
            >
              Siguiente →
            </Button>
          ) : (
            <Button
              type="submit"
              variant="contained"
              disabled={pending}
              sx={{
                bgcolor: "#F5853F",
                color: "#000022",
                "&:hover": { bgcolor: "#D96B20" },
                "&.Mui-disabled": { opacity: 0.7 },
              }}
            >
              {pending ? "Creando…" : "Crear empresa"}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  )
}
