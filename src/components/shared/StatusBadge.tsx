import Chip from "@mui/material/Chip"
import Box from "@mui/material/Box"

export type BadgeVariant = "green" | "amber" | "red" | "slate" | "blue"

type StatusBadgeProps = {
  variant: BadgeVariant
  children: React.ReactNode
  dot?: boolean
}

const variantColors: Record<BadgeVariant, { bg: string; color: string; dot: string }> = {
  green: { bg: "#D1FAE5", color: "#065F46", dot: "#10B981" },
  amber: { bg: "#FEF3C7", color: "#92400E", dot: "#F59E0B" },
  red: { bg: "#FEE2E2", color: "#991B1B", dot: "#EF4444" },
  slate: { bg: "#F1F5F9", color: "#475569", dot: "#94A3B8" },
  blue: { bg: "#DBEAFE", color: "#1D4ED8", dot: "#3B82F6" },
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
