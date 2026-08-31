"use client"

import Box from "@mui/material/Box"

export function ProgressDots({ steps, activeStep }: { steps: number; activeStep: number }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75 }}>
      {Array.from({ length: steps }).map((_, i) => (
        <Box
          key={i}
          sx={{
            height: 6,
            width: i === activeStep ? 20 : 6,
            borderRadius: "999px",
            bgcolor: i === activeStep ? "var(--portal-blue)" : "var(--portal-border)",
            transition: "width 220ms ease, background-color 220ms ease",
          }}
        />
      ))}
    </Box>
  )
}
