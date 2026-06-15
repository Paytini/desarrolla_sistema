import { Avatar, Box, Paper, Typography } from "@mui/material"
import { RingChart } from "@/components/portal/RingChart"
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
  /** Forces destructive semantics (bar, value, ring) regardless of `borderColor` */
  alert?: boolean
  /** Renders a RingChart with this percentage instead of the icon badge */
  ring?: number
}

// "primary"/"destructive" mirror theme.palette.primary.main/error.main as literals,
// since accent colors are consumed as plain strings (bgcolor, SVG-adjacent props).
const accentMap: Record<KpiBorderColor, { bar: string; icon: string; iconBg: string }> = {
  orange:      { bar: "#F5853F", icon: "#F5853F", iconBg: "rgba(245,133,63,0.1)" },
  charcoal:    { bar: "#000022", icon: "#000022", iconBg: "rgba(0,0,34,0.07)" },
  amber:       { bar: "#f59e0b", icon: "#f59e0b", iconBg: "rgba(245,158,11,0.1)" },
  rose:        { bar: "#f43f5e", icon: "#f43f5e", iconBg: "rgba(244,63,94,0.1)" },
  blue:        { bar: "#1a4f8a", icon: "#1a4f8a", iconBg: "rgba(26,79,138,0.1)" },
  green:       { bar: "#22c55e", icon: "#22c55e", iconBg: "rgba(34,197,94,0.1)" },
  primary:     { bar: "#F5853F", icon: "#F5853F", iconBg: "rgba(245,133,63,0.1)" },
  destructive: { bar: "#EF4444", icon: "#EF4444", iconBg: "rgba(239,68,68,0.1)" },
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
  const { bar, icon: iconColor, iconBg } = accentMap[alert ? "destructive" : borderColor]
  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, bgcolor: bar }} />
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", px: 2.5, py: 2.5, pt: 3 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "text.secondary" }}>
            {label}
          </Typography>
          <Typography
            variant="h3"
            sx={{
              mt: 1,
              fontSize: 34,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.01em",
              fontVariantNumeric: "tabular-nums",
              color: alert ? "error.main" : "text.primary",
            }}
          >
            {value}
          </Typography>
          {sub && (
            <Typography sx={{ mt: 1, fontSize: 12, color: "text.secondary" }}>
              {sub}
            </Typography>
          )}
        </Box>
        {ring !== undefined ? (
          <RingChart pct={ring} color={iconColor} />
        ) : Icon ? (
          <Avatar sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: iconBg, color: iconColor }}>
            <Icon size={18} strokeWidth={2} />
          </Avatar>
        ) : null}
      </Box>
    </Paper>
  )
}
