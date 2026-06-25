"use client"

import { useEffect, useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogContent from "@mui/material/DialogContent"
import Typography from "@mui/material/Typography"
import { Award, BarChart3, BookOpen, CheckCircle2, ClipboardList, GraduationCap, Users } from "lucide-react"

type Step = {
  icon: React.ReactNode
  title: string
  body: string
}

const RH_STEPS: Step[] = [
  {
    icon: <GraduationCap size={26} />,
    title: "Bienvenido al portal RH",
    body: "Desde aquí administras la capacitación de toda tu empresa: alta de colaboradores, asignación de cursos, seguimiento de avance y generación de constancias DC-3 para cumplimiento STPS.",
  },
  {
    icon: <Users size={26} />,
    title: "Gestión de empleados",
    body: 'En "Empleados" das de alta a tu plantilla de forma individual o por importación CSV. Cada colaborador recibe sus propias credenciales para acceder a sus cursos en el portal.',
  },
  {
    icon: <ClipboardList size={26} />,
    title: "Asignación de cursos",
    body: 'En "Asignaciones" vinculas el paquete de cursos activo con cada colaborador. Si cambias el paquete de tu empresa, usa "Sincronizar" para que los nuevos cursos lleguen a todos.',
  },
  {
    icon: <BarChart3 size={26} />,
    title: "Seguimiento de progreso",
    body: 'En "Progreso" ves en tiempo real el avance de cada colaborador. Usa el buscador para filtrar por nombre y detecta quién necesita un seguimiento.',
  },
  {
    icon: <Award size={26} />,
    title: "Constancias DC-3",
    body: 'En "Constancias DC-3" se generan automáticamente las evidencias de capacitación para cumplimiento STPS. Descárgalas individualmente o todas juntas en un solo ZIP.',
  },
]

const EMPLEADO_STEPS: Step[] = [
  {
    icon: <GraduationCap size={26} />,
    title: "Bienvenido a tu portal",
    body: "Aquí encuentras tus cursos asignados y el registro de tu capacitación. Los datos se sincronizan automáticamente con la plataforma de aprendizaje — si acabas de ingresar, aparecerán en breve.",
  },
  {
    icon: <BookOpen size={26} />,
    title: "Tus cursos",
    body: 'Cada tarjeta muestra tu avance en ese curso. "Iniciar" abre un curso nuevo, "Continuar" retoma donde lo dejaste, y "Repasar" te permite revisar uno que ya completaste.',
  },
  {
    icon: <CheckCircle2 size={26} />,
    title: "Tus constancias DC-3",
    body: 'Cuando completas un curso, tu constancia DC-3 oficial aparece automáticamente en "Constancias". Es el documento STPS que acredita tu capacitación — descárgala cuando la necesites.',
  },
]

export function OnboardingTour({
  rol,
  userId,
}: {
  rol: "RH" | "EMPLEADO"
  userId: string
}) {
  const storageKey = `d360_onboarding_v1_${rol}_${userId}`
  const steps = rol === "RH" ? RH_STEPS : EMPLEADO_STEPS

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) setOpen(true)
  }, [storageKey])

  function dismiss() {
    localStorage.setItem(storageKey, "1")
    setOpen(false)
  }

  function next() {
    if (step < steps.length - 1) setStep((s) => s + 1)
    else dismiss()
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1))
  }

  const current = steps[step]
  const isLast  = step === steps.length - 1

  return (
    <Dialog
      open={open}
      onClose={dismiss}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          elevation: 0,
          sx: {
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid #E5E7EB",
            boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
          },
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Accent stripe */}
        <Box sx={{ height: 4, bgcolor: "#3B82F6" }} />

        <Box sx={{ px: 3.5, pt: 3, pb: 3.5 }}>
          {/* Icon + heading */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2.5 }}>
            <Box
              sx={{
                flexShrink: 0,
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "12px",
                bgcolor: "#EFF6FF",
                color: "#3B82F6",
              }}
            >
              {current.icon}
            </Box>
            <Box sx={{ pt: 0.25 }}>
              <Typography sx={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9CA3AF", mb: 0.5 }}>
                Paso {step + 1} de {steps.length}
              </Typography>
              <Typography sx={{ fontSize: "1.0625rem", fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
                {current.title}
              </Typography>
            </Box>
          </Box>

          {/* Body */}
          <Typography sx={{ fontSize: "0.875rem", color: "#4B5563", lineHeight: 1.7, mb: 3.5 }}>
            {current.body}
          </Typography>

          {/* Step dots */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 3 }}>
            {steps.map((_, i) => (
              <Box
                key={i}
                sx={{
                  height: 6,
                  width: i === step ? 20 : 6,
                  borderRadius: "999px",
                  bgcolor: i === step ? "#3B82F6" : "#E5E7EB",
                  transition: "width 220ms ease, background-color 220ms ease",
                }}
              />
            ))}
          </Box>

          {/* Actions */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Button
              size="small"
              onClick={dismiss}
              sx={{
                fontSize: "0.75rem",
                color: "#9CA3AF",
                textTransform: "none",
                px: 0,
                minWidth: 0,
                "&:hover": { color: "#6B7280", bgcolor: "transparent" },
              }}
            >
              Saltar
            </Button>

            <Box sx={{ display: "flex", gap: 1 }}>
              {step > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={prev}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    borderColor: "#E5E7EB",
                    color: "#374151",
                    borderRadius: "8px",
                    px: 2,
                    "&:hover": { borderColor: "#D1D5DB", bgcolor: "#F9FAFB" },
                  }}
                >
                  Anterior
                </Button>
              )}
              <Button
                size="small"
                variant="contained"
                disableElevation
                onClick={next}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  bgcolor: "#3B82F6",
                  borderRadius: "8px",
                  px: 2.5,
                  "&:hover": { bgcolor: "#2563EB" },
                }}
              >
                {isLast ? "¡Entendido!" : "Siguiente →"}
              </Button>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
