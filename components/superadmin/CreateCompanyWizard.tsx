"use client"

import { useActionState, useRef, useState } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import MenuItem from "@mui/material/MenuItem"
import Step from "@mui/material/Step"
import StepLabel from "@mui/material/StepLabel"
import Stepper from "@mui/material/Stepper"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"

import { createCompanyAction } from "@/app/(portal)/superadmin/companies/actions"
import { PasswordToggleInput } from "@/components/superadmin/PasswordToggleInput"
import type { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"

type Paquete = Awaited<ReturnType<typeof getSuperadminEmpresasSnapshot>>["paquetes"][number]

const STEPS = ["Info empresa", "Admin RH", "Plan"]

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
  color: "text.primary",
  mb: 0.75,
  display: "block",
}

type FormValues = {
  nombre: string
  rfc: string
  telefono: string
  email_rh: string
  nombre_rh: string
  password_rh: string
  asientos_contratados: string
  paquete_id: string
  fecha_vencimiento: string
  notas: string
}

export function CreateCompanyWizard({ paquetes }: { paquetes: Paquete[] }) {
  const [step, setStep]              = useState(0)
  const [state, formAction, pending] = useActionState(createCompanyAction, null)
  const formRef                      = useRef<HTMLFormElement>(null)

  const [values, setValues] = useState<FormValues>({
    nombre:               "",
    rfc:                  "",
    telefono:             "",
    email_rh:             "",
    nombre_rh:            "",
    password_rh:          "",
    asientos_contratados: "25",
    paquete_id:           "",
    fecha_vencimiento:    "",
    notas:                "",
  })

  function set(name: keyof FormValues, value: string) {
    setValues((v) => ({ ...v, [name]: value }))
  }

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

  function handleNext() {
    if (validateCurrentStep()) setStep((s) => s + 1)
  }

  const [handledState, setHandledState] = useState(state)
  if (state !== handledState) {
    setHandledState(state)
    if (state?.error === "email_rh" || state?.error === "usuario_rh") setStep(1)
    if (state?.error === "datos") setStep(0)
  }

  const isRhError = state?.error === "email_rh" || state?.error === "usuario_rh"

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <Stepper activeStep={step} sx={{ mb: 5 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box component="form" ref={formRef} action={formAction} noValidate>

        {step !== 0 && (
          <>
            <input type="hidden" name="nombre"    value={values.nombre}   />
            <input type="hidden" name="rfc"       value={values.rfc}      />
            <input type="hidden" name="telefono"  value={values.telefono} />
          </>
        )}
        {step !== 1 && (
          <>
            <input type="hidden" name="email_rh"   value={values.email_rh}   />
            <input type="hidden" name="nombre_rh"  value={values.nombre_rh}  />
            <input type="hidden" name="password_rh" value={values.password_rh} />
          </>
        )}
        {step !== 2 && (
          <>
            <input type="hidden" name="asientos_contratados" value={values.asientos_contratados} />
            <input type="hidden" name="paquete_id"           value={values.paquete_id}           />
            <input type="hidden" name="fecha_vencimiento"    value={values.fecha_vencimiento}    />
            <input type="hidden" name="notas"                value={values.notas}                />
          </>
        )}

        {step === 0 && (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            {state?.error === "datos" && (
              <Alert severity="error">{ERROR_MESSAGES.datos}</Alert>
            )}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <Box>
                <Typography component="label" htmlFor="nombre" sx={LABEL_SX}>Nombre *</Typography>
                <TextField
                  id="nombre"
                  name="nombre"
                  required
                  placeholder="CEMEX S.A. de C.V."
                  size="small"
                  fullWidth
                  value={values.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                />
              </Box>
              <Box>
                <Typography component="label" htmlFor="rfc" sx={LABEL_SX}>RFC</Typography>
                <TextField
                  id="rfc"
                  name="rfc"
                  placeholder="XAXX010101000"
                  size="small"
                  fullWidth
                  value={values.rfc}
                  onChange={(e) => set("rfc", e.target.value)}
                />
              </Box>
            </Box>
            <Box sx={{ maxWidth: 320 }}>
              <Typography component="label" htmlFor="telefono" sx={LABEL_SX}>Teléfono</Typography>
              <TextField
                id="telefono"
                name="telefono"
                placeholder="55 1234 5678"
                size="small"
                fullWidth
                value={values.telefono}
                onChange={(e) => set("telefono", e.target.value)}
              />
            </Box>
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <Box>
                <Typography component="label" htmlFor="email_rh" sx={LABEL_SX}>Correo RH *</Typography>
                <TextField
                  id="email_rh"
                  name="email_rh"
                  type="email"
                  required
                  placeholder="rh@empresa.com"
                  size="small"
                  fullWidth
                  error={isRhError}
                  helperText={isRhError ? ERROR_MESSAGES[state!.error] : undefined}
                  value={values.email_rh}
                  onChange={(e) => set("email_rh", e.target.value)}
                />
              </Box>
              <Box>
                <Typography component="label" htmlFor="nombre_rh" sx={LABEL_SX}>Nombre completo *</Typography>
                <TextField
                  id="nombre_rh"
                  name="nombre_rh"
                  required
                  placeholder="María González"
                  size="small"
                  fullWidth
                  value={values.nombre_rh}
                  onChange={(e) => set("nombre_rh", e.target.value)}
                />
              </Box>
            </Box>
            <Box sx={{ maxWidth: 320 }}>
              <Typography component="label" htmlFor="password_rh" sx={LABEL_SX}>Contraseña temporal *</Typography>
              <PasswordToggleInput
                name="password_rh"
                minLength={8}
                required
                placeholder="Mín. 8 caracteres"
                value={values.password_rh}
                onChange={(e) => set("password_rh", e.target.value)}
              />
            </Box>
          </Box>
        )}

        {step === 2 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 260px" },
              gap: 3,
            }}
          >
            <Box sx={{ display: "grid", gap: 2.5 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <Box>
                  <Typography component="label" htmlFor="asientos_contratados" sx={LABEL_SX}>Cupos *</Typography>
                  <TextField
                    id="asientos_contratados"
                    name="asientos_contratados"
                    type="number"
                    required
                    slotProps={{ htmlInput: { min: 1 } }}
                    size="small"
                    fullWidth
                    value={values.asientos_contratados}
                    onChange={(e) => set("asientos_contratados", e.target.value)}
                  />
                </Box>
                <Box>
                  <Typography component="label" htmlFor="paquete_id" sx={LABEL_SX}>Paquete inicial</Typography>
                  <TextField
                    id="paquete_id"
                    name="paquete_id"
                    select
                    size="small"
                    fullWidth
                    value={values.paquete_id}
                    onChange={(e) => set("paquete_id", e.target.value)}
                  >
                    <MenuItem value="">Sin asignar</MenuItem>
                    {paquetes.map((p) => (
                      <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Box>
              <Box sx={{ maxWidth: 220 }}>
                <Typography component="label" htmlFor="fecha_vencimiento" sx={LABEL_SX}>Vigencia</Typography>
                <TextField
                  id="fecha_vencimiento"
                  name="fecha_vencimiento"
                  type="date"
                  size="small"
                  fullWidth
                  value={values.fecha_vencimiento}
                  onChange={(e) => set("fecha_vencimiento", e.target.value)}
                />
              </Box>
              <Box>
                <Typography component="label" htmlFor="notas" sx={LABEL_SX}>Notas internas</Typography>
                <TextField
                  id="notas"
                  name="notas"
                  multiline
                  rows={3}
                  placeholder="Observaciones del contrato…"
                  size="small"
                  fullWidth
                  value={values.notas}
                  onChange={(e) => set("notas", e.target.value)}
                />
              </Box>
            </Box>

            <Box
              sx={{
                bgcolor: "background.default",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "16px",
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
              {(
                [
                  { label: "Empresa",  key: "nombre"    },
                  { label: "RFC",      key: "rfc"       },
                  { label: "Teléfono", key: "telefono"  },
                  { label: "Email RH", key: "email_rh"  },
                  { label: "Admin RH", key: "nombre_rh" },
                ] as { label: string; key: keyof FormValues }[]
              ).map(({ label, key }) => (
                <Box key={key} sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontSize: 10, color: "text.secondary" }}>{label}</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>
                    {values[key] || "—"}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

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
            sx={{ visibility: step === 0 ? "hidden" : "visible" }}
          >
            ← Regresar
          </Button>

          {step < 2 ? (
            <Button
              type="button"
              onClick={handleNext}
              variant="contained"
            >
              Siguiente →
            </Button>
          ) : (
            <Button
              type="submit"
              variant="contained"
              disabled={pending}
              sx={{ "&.Mui-disabled": { opacity: 0.7 } }}
            >
              {pending ? "Creando…" : "Crear empresa"}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  )
}
