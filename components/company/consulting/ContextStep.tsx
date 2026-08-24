"use client"

import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"

const MIN_LENGTH = 10
const MAX_LENGTH = 400

type ContextStepProps = {
  value: string
  onChange: (context: string) => void
  onBack: () => void
  onNext: () => void
}

export function ContextStep({ value, onChange, onBack, onNext }: ContextStepProps) {
  const isValid = value.trim().length >= MIN_LENGTH && value.length <= MAX_LENGTH

  return (
    <Box>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--portal-blue)",
          mb: 1,
        }}
      >
        Paso 2 · Contexto
      </Typography>
      <Typography sx={{ fontSize: 26, fontWeight: 800, color: "text.primary", mb: 0.5 }}>
        Cuéntanos brevemente el motivo
      </Typography>
      <Typography sx={{ fontSize: 14, color: "text.secondary", mb: 3 }}>
        Ayúdanos a preparar la sesión con un mensaje corto de tu situación o pregunta.
      </Typography>

      <TextField
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, MAX_LENGTH))}
        multiline
        minRows={5}
        fullWidth
        placeholder="Ej. Queremos preparar a nuestro equipo de almacén para la próxima auditoría CTPAT."
        helperText={`${value.length}/${MAX_LENGTH}`}
        slotProps={{ formHelperText: { sx: { textAlign: "right" } } }}
      />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 4,
          pt: 3,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button type="button" variant="outlined" onClick={onBack}>
          ← Atrás
        </Button>
        <Button type="button" variant="contained" disabled={!isValid} onClick={onNext}>
          Continuar →
        </Button>
      </Box>
    </Box>
  )
}
