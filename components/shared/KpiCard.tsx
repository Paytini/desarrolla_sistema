import { Avatar, Box, Paper, Typography } from "@mui/material"
import { RingChart } from "@/components/shared/RingChart"
import type { LucideIcon } from "lucide-react"

export type KpiBorderColor =
  | "orange" | "charcoal" | "amber" | "rose" | "blue" | "green"
  | "primary" | "destructive"

type KpiCardProps = {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  borderColor?: KpiBorderColor
  alert?: boolean
  ring?: number
}

const accentMap: Record<KpiBorderColor, { bg: string; shadow: string }> = {
  orange:      { bg: "#F5853F", shadow: "rgba(245,133,63,0.36)"  },
  charcoal:    { bg: "#4B5563", shadow: "rgba(75,85,99,0.28)"    },
  amber:       { bg: "#FF9F43", shadow: "rgba(255,159,67,0.36)"  },
  rose:        { bg: "#EA5455", shadow: "rgba(234,84,85,0.36)"   },
  blue:        { bg: "#7367F0", shadow: "rgba(115,103,240,0.36)" },
  green:       { bg: "#28C76F", shadow: "rgba(40,199,111,0.36)"  },
  primary:     { bg: "#F5853F", shadow: "rgba(245,133,63,0.36)"  },
  destructive: { bg: "#EA5455", shadow: "rgba(234,84,85,0.36)"   },
}

export default function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  borderColor = "orange",
  alert = false,
  ring,
}: KpiCardProps) {
  const { bg, shadow } = accentMap[alert ? "destructive" : borderColor]

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 0,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 2px 6px rgba(0,0,34,0.05), 0 0 1px rgba(0,0,34,0.04)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        "&:hover": {
          boxShadow: "0 6px 20px rgba(0,0,34,0.09)",
          transform: "translateY(-2px)",
        },
      }}
    >
      <Box sx={{ px: 3, pt: 2.5, pb: 2.5 }}>
        {/* Visual superior — ícono filled (Materio skin="filled") o ring chart */}
        <Box sx={{ mb: 2.5 }}>
          {ring !== undefined ? (
            <RingChart pct={ring} color={bg} size={52} sw={5} />
          ) : Icon ? (
            <Avatar
              sx={{
                width: 42,
                height: 42,
                borderRadius: "10px",
                bgcolor: bg,
                color: "#ffffff",
                boxShadow: `0 4px 12px ${shadow}`,
              }}
            >
              <Icon size={20} strokeWidth={2} />
            </Avatar>
          ) : null}
        </Box>

        {/* Tipografía — label → value → sub */}
        <Typography
          sx={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "text.primary",
            mb: 0.5,
          }}
        >
          {label}
        </Typography>

        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            color: alert ? "error.main" : "text.primary",
            mb: sub ? 0.75 : 0,
          }}
        >
          {value}
        </Typography>

        {sub && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {sub}
          </Typography>
        )}
      </Box>
    </Paper>
  )
}
