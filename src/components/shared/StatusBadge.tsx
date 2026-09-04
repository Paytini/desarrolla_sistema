import Chip from "@mui/material/Chip"
import Box from "@mui/material/Box"
import { amber, blue, emerald, fd, red, slate } from "@/lib/theme-tokens"

export type BadgeVariant = "green" | "amber" | "red" | "slate" | "blue"

type StatusBadgeProps = {
  variant: BadgeVariant
  children: React.ReactNode
  dot?: boolean
}

const variantColors: Record<BadgeVariant, { bg: string; color: string; dot: string }> = {
  green: { bg: emerald[100], color: emerald[800], dot: fd.secondary },
  amber: { bg: amber[100], color: amber[800], dot: fd.accent },
  red: { bg: red[100], color: red[800], dot: red[500] },
  slate: { bg: slate[100], color: slate[600], dot: slate[400] },
  blue: { bg: blue[100], color: blue[700], dot: fd.primary },
}

export default function StatusBadge({ variant, children, dot }: StatusBadgeProps) {
  const c = variantColors[variant]
  return (
    <Chip
      size="small"
      label={
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          {dot && (
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: c.dot, flexShrink: 0 }} />
          )}
          {children}
        </Box>
      }
      sx={{
        height: 24,
        borderRadius: "9999px",
        border: "none",
        bgcolor: c.bg,
        color: c.color,
        fontSize: "11px",
        fontWeight: 700,
        "& .MuiChip-label": { px: 1.5 },
      }}
    />
  )
}
