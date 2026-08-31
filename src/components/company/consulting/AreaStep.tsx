"use client"

import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import EyebrowLabel from "@/components/shared/EyebrowLabel"
import { CONSULTING_AREAS, type ConsultingAreaId } from "@/lib/consulting-areas"
import { kpiColorMap } from "@/lib/kpi-colors"

type AreaStepProps = {
  value: ConsultingAreaId | null
  onChange: (area: ConsultingAreaId) => void
  onNext: () => void
}

export function AreaStep({ value, onChange, onNext }: AreaStepProps) {
  return (
    <Box>
      <EyebrowLabel color="var(--portal-blue)" sx={{ fontSize: 11, mb: 1 }}>
        Paso 1 · Área
      </EyebrowLabel>
      <Typography sx={{ fontSize: 26, fontWeight: 800, color: "text.primary", mb: 0.5 }}>
        ¿En qué área necesitas ayuda?
      </Typography>
      <Typography sx={{ fontSize: 14, color: "text.secondary", mb: 3 }}>
        Selecciona la especialidad. Te asignaremos al consultor con más experiencia en ese tema.
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        {CONSULTING_AREAS.map((option) => {
          const selected = value === option.id
          const Icon = option.icon
          const { bg } = kpiColorMap[option.color]

          return (
            <Box
              key={option.id}
              component="button"
              type="button"
              onClick={() => onChange(option.id)}
              sx={{
                textAlign: "left",
                cursor: "pointer",
                border: "2px solid",
                borderColor: selected ? "var(--portal-blue)" : "var(--portal-border)",
                bgcolor: selected ? "rgba(53, 121, 245, 0.06)" : "background.paper",
                borderRadius: "12px",
                p: 2,
                display: "flex",
                gap: 1.5,
                alignItems: "flex-start",
                transition: "border-color 150ms, background-color 150ms",
                font: "inherit",
                "&:hover": { borderColor: "var(--portal-blue)" },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  bgcolor: bg,
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={20} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>
                  {option.label}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.25 }}>
                  {option.description}
                </Typography>
              </Box>
            </Box>
          )
        })}
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          mt: 4,
          pt: 3,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button type="button" variant="contained" disabled={!value} onClick={onNext}>
          Continuar →
        </Button>
      </Box>
    </Box>
  )
}
