"use client"

import { Moon, Sun, Sunrise } from "lucide-react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"

const periodConfig = {
  morning:   { label: "Buenos días",   icon: Sunrise },
  afternoon: { label: "Buenas tardes", icon: Sun },
  evening:   { label: "Buenas noches", icon: Moon },
} as const

export function PortalGreeting({ name }: { name: string; rol: string }) {
  const hour     = new Date().getHours()
  const period   = hour < 12 ? "morning" : hour < 19 ? "afternoon" : "evening"
  const { label: greeting, icon: Icon } = periodConfig[period]
  const firstName = name.split(" ")[0] ?? name

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
      <Icon size={20} strokeWidth={1.75} style={{ color: "#858382", flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="overline"
          sx={{ display: "block", color: "text.secondary", lineHeight: 1, mb: 0.25 }}
        >
          {greeting}
        </Typography>
        <Typography
          variant="h2"
          sx={{
            fontSize: "1.25rem",
            lineHeight: 1.15,
            color: "text.primary",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {firstName}
        </Typography>
      </Box>
    </Box>
  )
}
