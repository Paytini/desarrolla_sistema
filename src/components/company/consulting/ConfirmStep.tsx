"use client"

import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import EyebrowLabel from "@/components/shared/EyebrowLabel"
import { Mail, MessageCircle, Phone } from "lucide-react"
import { getConsultingArea } from "@/lib/consulting-areas"
import { formatConsultingDateTime } from "@/lib/consulting-schedule"

const ERROR_MESSAGES: Record<string, string> = {
  datos: "Revisa que todos los campos estén completos y sean válidos, e intenta de nuevo.",
}

const CONTACT_METHODS = [
  { id: "CALL", label: "Llamada", icon: Phone },
  { id: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { id: "EMAIL", label: "Correo", icon: Mail },
] as const

type ConfirmStepProps = {
  areaId: string
  context: string
  date: string
  time: string
  requesterName: string
  requesterEmail: string
  phone: string
  onChangePhone: (phone: string) => void
  contactMethod: string
  onChangeContactMethod: (method: string) => void
  onBack: () => void
  onEditStep: (step: number) => void
  pending: boolean
  error?: string
}

export function ConfirmStep({
  areaId,
  context,
  date,
  time,
  requesterName,
  requesterEmail,
  phone,
  onChangePhone,
  contactMethod,
  onChangeContactMethod,
  onBack,
  onEditStep,
  pending,
  error,
}: ConfirmStepProps) {
  const area = getConsultingArea(areaId)
  const isValid = phone.replace(/\D/g, "").length >= 10 && Boolean(contactMethod)

  const summaryRows = [
    { label: "Área", value: area?.label ?? "—", step: 0 },
    { label: "Contexto", value: context, step: 1 },
    { label: "Fecha y hora", value: formatConsultingDateTime(date, time), step: 2 },
  ]

  return (
    <Box>
      <EyebrowLabel color="var(--portal-blue)" sx={{ fontSize: 11, mb: 1 }}>
        Paso 4 · Confirmación
      </EyebrowLabel>
      <Typography sx={{ fontSize: 26, fontWeight: 800, color: "text.primary", mb: 0.5 }}>
        Revisa y confirma tu solicitud
      </Typography>
      <Typography sx={{ fontSize: 14, color: "text.secondary", mb: 3 }}>
        Te contactaremos para confirmar los detalles finales de la sesión.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 3, borderRadius: "12px" }}>
          {ERROR_MESSAGES[error] ?? "Ocurrió un error inesperado, intenta de nuevo."}
        </Alert>
      ) : null}

      <Box
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: "12px", p: 2.5, mb: 3 }}
      >
        {summaryRows.map((row) => (
          <Box
            key={row.label}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 2,
              py: 1.25,
              "&:not(:last-of-type)": { borderBottom: "1px solid", borderColor: "divider" },
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 0.25 }}>
                {row.label}
              </Typography>
              <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "text.primary" }}>
                {row.value}
              </Typography>
            </Box>
            <Button
              size="small"
              type="button"
              onClick={() => onEditStep(row.step)}
              sx={{ fontSize: 12, flexShrink: 0 }}
            >
              Editar
            </Button>
          </Box>
        ))}
      </Box>

      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}>
        Te contactaremos a <strong>{requesterName}</strong> ({requesterEmail}).
      </Typography>

      <TextField
        label="Teléfono de contacto"
        value={phone}
        onChange={(event) => onChangePhone(event.target.value)}
        fullWidth
        sx={{ mb: 3 }}
      />

      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mb: 1 }}>
        ¿Cómo prefieres que te contactemos?
      </Typography>
      <Box sx={{ display: "flex", gap: 1.5, mb: 4 }}>
        {CONTACT_METHODS.map(({ id, label, icon: Icon }) => {
          const selected = contactMethod === id
          return (
            <Box
              key={id}
              component="button"
              type="button"
              onClick={() => onChangeContactMethod(id)}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
                py: 1.5,
                borderRadius: "12px",
                border: "1.5px solid",
                borderColor: selected ? "var(--portal-blue)" : "var(--portal-border)",
                bgcolor: selected ? "rgba(53, 121, 245, 0.06)" : "transparent",
                color: selected ? "var(--portal-blue)" : "text.primary",
                cursor: "pointer",
              }}
            >
              <Icon size={18} />
              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{label}</Typography>
            </Box>
          )
        })}
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          pt: 3,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button type="button" variant="outlined" onClick={onBack}>
          ← Atrás
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={!isValid || pending}
          sx={{ "&.Mui-disabled": { opacity: 0.7 } }}
        >
          {pending ? "Agendando…" : "Agendar consultoría"}
        </Button>
      </Box>
    </Box>
  )
}
