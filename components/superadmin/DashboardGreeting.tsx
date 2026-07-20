"use client"

import { Box, Typography } from "@mui/material"

const periodConfig = {
  morning:   "Buenos días",
  afternoon: "Buenas tardes",
  evening:   "Buenas noches",
} as const

export function DashboardGreeting({ nombre }: { nombre: string }) {
  const hour     = new Date().getHours()
  const period   = hour < 12 ? "morning" : hour < 19 ? "afternoon" : "evening"
  const greeting = periodConfig[period]
  const firstName = nombre.split(" ")[0] ?? nombre

  return (
    <Box sx={{ mb: 0.5 }}>
      <Typography
        sx={{
          fontSize: "0.75rem",
          fontWeight: 700,
          color: "var(--kpi-icon-color, #3579F5)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          mb: 0.75,
        }}
      >
        {greeting}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'var(--font-outfit, "Outfit"), system-ui, sans-serif',
          fontSize: "2rem",
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          color: "var(--kpi-text, #161B23)",
          mb: 0.5,
        }}
      >
        ¡Hola, {firstName}!
      </Typography>
      <Typography
        sx={{
          fontSize: "0.9375rem",
          color: "var(--kpi-text-secondary, rgba(22,27,35,0.6))",
        }}
      >
        Aquí tienes el estado operativo de tus empresas cliente.
      </Typography>
    </Box>
  )
}
