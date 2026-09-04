"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { Upload, X } from "lucide-react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import MenuItem from "@mui/material/MenuItem"
import Step from "@mui/material/Step"
import StepLabel from "@mui/material/StepLabel"
import { gray } from "@/lib/theme-tokens"
import Stepper from "@mui/material/Stepper"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"

import { createCompanyAction } from "@/app/(portal)/superadmin/companies/actions"
import { PasswordToggleInput } from "@/components/superadmin/PasswordToggleInput"
import type { getSuperadminCompaniesSnapshot } from "@/lib/dashboard-cache"

type Package = Awaited<ReturnType<typeof getSuperadminCompaniesSnapshot>>["paquetes"][number]

const STEPS = ["Info empresa", "Admin HR", "Plan"]

const LOGO_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024

const ERROR_MESSAGES: Record<string, string> = {
  datos: "Faltan datos obligatorios.",
  email_hr: "Ese correo ya está ligado a otra empresa.",
  usuario_hr: "Ese correo ya existe como usuario del portal.",
  logo: "Falta el logo, o no es válido (usa PNG, JPG o WebP, máx. 2 MB).",
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
  email_hr: string
  nombre_hr: string
  password_hr: string
  asientos_contratados: string
  paquete_id: string
  fecha_vencimiento: string
  notas: string
}

export function CreateCompanyWizard({ paquetes }: { paquetes: Package[] }) {
  const [step, setStep] = useState(0)
  const [state, formAction, pending] = useActionState(createCompanyAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  const [values, setValues] = useState<FormValues>({
    nombre: "",
    rfc: "",
    telefono: "",
    email_hr: "",
    nombre_hr: "",
    password_hr: "",
    asientos_contratados: "25",
    paquete_id: "",
    fecha_vencimiento: "",
    notas: "",
  })

  function set(name: keyof FormValues, value: string) {
    setValues((v) => ({ ...v, [name]: value }))
  }

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [isDraggingLogo, setIsDraggingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    }
  }, [logoPreviewUrl])

  function applyLogoFile(file: File | null) {
    setLogoError(null)

    if (file) {
      if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
        setLogoError("Formato no válido. Usa PNG, JPG o WebP.")
        return
      }
      if (file.size > LOGO_MAX_SIZE_BYTES) {
        setLogoError("El archivo supera el límite de 2 MB.")
        return
      }
    }

    if (logoInputRef.current) {
      const transfer = new DataTransfer()
      if (file) transfer.items.add(file)
      logoInputRef.current.files = transfer.files
    }

    setLogoFile(file)
    setLogoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : null
    })
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    applyLogoFile(e.target.files?.[0] ?? null)
  }

  function handleLogoDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDraggingLogo(false)
    applyLogoFile(e.dataTransfer.files?.[0] ?? null)
  }

  function validateCurrentStep(): boolean {
    if (step === 0 && !logoFile) {
      setLogoError("Selecciona un logo para continuar.")
      return false
    }
    if (!formRef.current) return true
    const requiredByStep: Record<number, string[]> = {
      0: ["nombre"],
      1: ["email_hr", "nombre_hr", "password_hr"],
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
    if (state?.error === "email_hr" || state?.error === "usuario_hr") setStep(1)
    if (state?.error === "datos" || state?.error === "logo") setStep(0)
  }

  const isHrError = state?.error === "email_hr" || state?.error === "usuario_hr"

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <Stepper activeStep={step} sx={{ mb: 5 }}>
        {STEPS.map((label) => (
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
        onKeyDown={(e) => {
          // Pressing Enter in a text field (e.g. right after typing "Cupos") would
          // otherwise implicitly submit the form the moment step 2 mounts its real
          // submit button — before the user gets to review Plan. Scoped to <input>
          // so Tab+Enter still activates the Siguiente/Regresar buttons normally.
          if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
            e.preventDefault()
          }
        }}
      >
        {step !== 0 && (
          <>
            <input type="hidden" name="nombre" value={values.nombre} />
            <input type="hidden" name="rfc" value={values.rfc} />
            <input type="hidden" name="telefono" value={values.telefono} />
          </>
        )}
        {step !== 1 && (
          <>
            <input type="hidden" name="email_hr" value={values.email_hr} />
            <input type="hidden" name="nombre_hr" value={values.nombre_hr} />
            <input type="hidden" name="password_hr" value={values.password_hr} />
          </>
        )}
        {step !== 2 && (
          <>
            <input type="hidden" name="asientos_contratados" value={values.asientos_contratados} />
            <input type="hidden" name="paquete_id" value={values.paquete_id} />
            <input type="hidden" name="fecha_vencimiento" value={values.fecha_vencimiento} />
            <input type="hidden" name="notas" value={values.notas} />
          </>
        )}

        <Box sx={{ display: step === 0 ? "block" : "none", mb: 3 }}>
          <Typography component="label" htmlFor="logo" sx={LABEL_SX}>
            Logo *
          </Typography>
          <Box
            onClick={() => logoInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDraggingLogo(true)
            }}
            onDragLeave={() => setIsDraggingLogo(false)}
            onDrop={handleLogoDrop}
            sx={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              minHeight: 168,
              p: 3,
              borderRadius: "16px",
              border: "2px dashed",
              borderColor: isDraggingLogo ? "primary.main" : logoError ? "error.main" : "divider",
              bgcolor: isDraggingLogo ? "action.hover" : "background.default",
              cursor: "pointer",
              textAlign: "center",
              transition: "border-color 120ms ease, background-color 120ms ease",
            }}
          >
            <input
              ref={logoInputRef}
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={handleLogoChange}
            />

            {logoPreviewUrl ? (
              <>
                <Button
                  type="button"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    applyLogoFile(null)
                  }}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    minWidth: 0,
                    p: 0.75,
                    borderRadius: "999px",
                    color: "text.secondary",
                  }}
                >
                  <X size={16} />
                </Button>
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not served through Next's optimizer */}
                <img
                  src={logoPreviewUrl}
                  alt="Vista previa del logo"
                  style={{ maxWidth: 160, maxHeight: 110, objectFit: "contain" }}
                />
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  Haz clic o arrastra otra imagen para cambiarla
                </Typography>
              </>
            ) : (
              <>
                <Upload size={26} strokeWidth={1.5} color={gray[400]} />
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>
                  Arrastra tu logo aquí o haz clic para subir
                </Typography>
                <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                  PNG, JPG o WebP · máx. 2 MB
                </Typography>
              </>
            )}
          </Box>
          {logoError && (
            <Typography sx={{ mt: 0.75, fontSize: "11px", color: "error.main" }}>
              {logoError}
            </Typography>
          )}
        </Box>

        {step === 0 && (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            {(state?.error === "datos" || state?.error === "logo") && (
              <Alert severity="error">{ERROR_MESSAGES[state.error]}</Alert>
            )}
            <Box
              sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}
            >
              <Box>
                <Typography component="label" htmlFor="nombre" sx={LABEL_SX}>
                  Nombre *
                </Typography>
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
                <Typography component="label" htmlFor="rfc" sx={LABEL_SX}>
                  RFC
                </Typography>
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
              <Typography component="label" htmlFor="telefono" sx={LABEL_SX}>
                Teléfono
              </Typography>
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
            <Box
              sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}
            >
              <Box>
                <Typography component="label" htmlFor="email_hr" sx={LABEL_SX}>
                  Correo HR *
                </Typography>
                <TextField
                  id="email_hr"
                  name="email_hr"
                  type="email"
                  required
                  placeholder="hr@empresa.com"
                  size="small"
                  fullWidth
                  error={isHrError}
                  helperText={isHrError ? ERROR_MESSAGES[state!.error] : undefined}
                  value={values.email_hr}
                  onChange={(e) => set("email_hr", e.target.value)}
                />
              </Box>
              <Box>
                <Typography component="label" htmlFor="nombre_hr" sx={LABEL_SX}>
                  Nombre completo *
                </Typography>
                <TextField
                  id="nombre_hr"
                  name="nombre_hr"
                  required
                  placeholder="María González"
                  size="small"
                  fullWidth
                  value={values.nombre_hr}
                  onChange={(e) => set("nombre_hr", e.target.value)}
                />
              </Box>
            </Box>
            <Box sx={{ maxWidth: 320 }}>
              <Typography component="label" htmlFor="password_hr" sx={LABEL_SX}>
                Contraseña temporal *
              </Typography>
              <PasswordToggleInput
                name="password_hr"
                minLength={8}
                required
                placeholder="Mín. 8 caracteres"
                value={values.password_hr}
                onChange={(e) => set("password_hr", e.target.value)}
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
                  <Typography component="label" htmlFor="asientos_contratados" sx={LABEL_SX}>
                    Cupos *
                  </Typography>
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
                  <Typography component="label" htmlFor="paquete_id" sx={LABEL_SX}>
                    Paquete inicial
                  </Typography>
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
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Box>
              <Box sx={{ maxWidth: 220 }}>
                <Typography component="label" htmlFor="fecha_vencimiento" sx={LABEL_SX}>
                  Vigencia
                </Typography>
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
                <Typography component="label" htmlFor="notas" sx={LABEL_SX}>
                  Notas internas
                </Typography>
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
              {logoPreviewUrl && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontSize: 10, color: "text.secondary" }}>Logo</Typography>
                  <Box
                    sx={{
                      mt: 0.5,
                      width: 48,
                      height: 48,
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      bgcolor: "background.paper",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                    <img
                      src={logoPreviewUrl}
                      alt="Vista previa del logo"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    />
                  </Box>
                </Box>
              )}
              {(
                [
                  { label: "Empresa", key: "nombre" },
                  { label: "RFC", key: "rfc" },
                  { label: "Teléfono", key: "telefono" },
                  { label: "Email HR", key: "email_hr" },
                  { label: "Admin HR", key: "nombre_hr" },
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
            type="button"
            onClick={() => setStep((s) => s - 1)}
            variant="outlined"
            sx={{ visibility: step === 0 ? "hidden" : "visible" }}
          >
            ← Regresar
          </Button>

          {step < 2 ? (
            <Button key="next" type="button" onClick={handleNext} variant="contained">
              Siguiente →
            </Button>
          ) : (
            <Button
              key="submit"
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
