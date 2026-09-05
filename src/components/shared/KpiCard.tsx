import type { CSSProperties } from "react"
import { Paper, Box, Typography } from "@mui/material"
import { RingChart } from "@/components/shared/RingChart"
import { fd, red } from "@/lib/theme-tokens"
import { kpiColorMap, type KpiColorKey } from "@/lib/kpi-colors"
import type { LucideIcon } from "lucide-react"

export type KpiBorderColor = KpiColorKey

type KpiCardProps = {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  borderColor?: KpiBorderColor
  alert?: boolean
  ring?: number
  /** "sm" for long text values (e.g. a package name) so they don't wrap and blow out the card height next to numeric KPIs. */
  valueSize?: "lg" | "sm"
}

export default function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  borderColor = "violet",
  alert = false,
  ring,
  valueSize = "lg",
}: KpiCardProps) {
  const { bg, text } = kpiColorMap[alert ? "rose" : borderColor]

  const isLight = text === fd.foreground
  const textSecondary = isLight ? "rgba(17,24,39,0.6)" : "rgba(255,255,255,0.7)"
  const ringArc = isLight ? "rgba(17,24,39,0.75)" : "rgba(255,255,255,0.92)"
  const ringTrack = isLight ? "rgba(17,24,39,0.15)" : "rgba(255,255,255,0.22)"

  // The shared --kpi-* tokens (designV4) flatten every card to the same
  // monochrome look, so an "alert" card needs its own override to actually
  // stand out instead of silently no-oping under that theme.
  const alertStyle = alert
    ? ({
        "--kpi-border": red[500],
        "--kpi-icon-display": "flex",
        "--kpi-icon-bg": "rgba(239, 68, 68, 0.12)",
        "--kpi-icon-color": red[500],
      } as CSSProperties)
    : undefined

  return (
    <Paper
      elevation={0}
      style={alertStyle}
      sx={{
        borderRadius: "var(--kpi-radius, 8px)",
        backgroundColor: `var(--kpi-bg, ${bg})`,
        border: "1px solid var(--kpi-border, transparent)",
        boxShadow: "var(--kpi-shadow, none)",
        overflow: "hidden",
        transition: "transform 200ms",
        "&:hover": { transform: "scale(1.02)" },
      }}
    >
      <Box sx={{ px: "var(--kpi-px, 24px)", pt: "var(--kpi-pt, 24px)", pb: "var(--kpi-pb, 20px)" }}>
        <Box sx={{ mb: 2, display: "var(--kpi-icon-display, flex)" }}>
          {ring !== undefined ? (
            <RingChart
              pct={ring}
              color={`var(--kpi-ring-arc, ${ringArc})`}
              trackColor={`var(--kpi-ring-track, ${ringTrack})`}
              textColor={`var(--kpi-text, ${text})`}
              size={52}
              sw={5}
            />
          ) : Icon ? (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                bgcolor: "var(--kpi-icon-bg, rgba(255,255,255,0.2))",
                color: `var(--kpi-icon-color, ${text})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={20} strokeWidth={2.5} />
            </Box>
          ) : null}
        </Box>

        <Typography
          sx={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: `var(--kpi-text-secondary, ${textSecondary})`,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            mb: 0.5,
          }}
        >
          {label}
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: "var(--kpi-value-direction, column)",
            alignItems: "var(--kpi-value-align, flex-start)",
            gap: "var(--kpi-value-gap, 4px)",
          }}
        >
          <Typography
            sx={{
              fontFamily: 'var(--font-outfit, "Outfit"), system-ui, sans-serif',
              fontSize: valueSize === "sm" ? "1.25rem" : "2rem",
              fontWeight: 800,
              lineHeight: 1.25,
              fontVariantNumeric: "tabular-nums",
              color: `var(--kpi-text, ${text})`,
            }}
          >
            {value}
          </Typography>

          {sub && (
            <Typography
              sx={{ fontSize: "0.75rem", color: `var(--kpi-text-secondary, ${textSecondary})` }}
            >
              {sub}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  )
}
