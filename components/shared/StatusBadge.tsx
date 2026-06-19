import Chip from "@mui/material/Chip"
import Box from "@mui/material/Box"

type BadgeVariant = "green" | "amber" | "red" | "slate" | "blue" | "orange"

type StatusBadgeProps = {
  variant: BadgeVariant
  children: React.ReactNode
  dot?: boolean
}

const variantColors: Record<BadgeVariant, { bg: string; color: string; dot: string }> = {
  green:  { bg: "#DCFCE7", color: "#15803D", dot: "#34D399" },
  amber:  { bg: "#FEF9C3", color: "#854D0E", dot: "#FBBF24" },
  red:    { bg: "#FEE2E2", color: "#B91C1C", dot: "#EF4444" },
  slate:  { bg: "#F1F5F9", color: "#475569", dot: "#94A3B8" },
  blue:   { bg: "#EDE9FE", color: "#5B21B6", dot: "#8B5CF6" },
  orange: { bg: "#FFEDD5", color: "#9A3412", dot: "#F5853F" },
}

export default function StatusBadge({ variant, children, dot }: StatusBadgeProps) {
  const c = variantColors[variant]
  return (
    <Chip
      size="small"
      label={
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          {dot && (
            <Box
              sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: c.dot, flexShrink: 0 }}
            />
          )}
          {children}
        </Box>
      }
      sx={{
        height: 24,
        borderRadius: "9999px",
        border: "2px solid #1E293B",
        bgcolor: c.bg,
        color: c.color,
        fontSize: "11px",
        fontWeight: 700,
        "& .MuiChip-label": { px: 1.5 },
      }}
    />
  )
}
