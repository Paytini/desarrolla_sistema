import Chip from "@mui/material/Chip"
import Box from "@mui/material/Box"

type BadgeVariant = "green" | "amber" | "red" | "slate" | "blue" | "orange"

type StatusBadgeProps = {
  variant: BadgeVariant
  children: React.ReactNode
  dot?: boolean
}

const variantColors: Record<BadgeVariant, { bg: string; color: string; border: string; dot: string }> = {
  green:  { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", dot: "#16a34a" },
  amber:  { bg: "#fffbeb", color: "#b45309", border: "#fde68a", dot: "#d97706" },
  red:    { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", dot: "#dc2626" },
  slate:  { bg: "#f8fafc", color: "#475569", border: "#e2e8f0", dot: "#94a3b8" },
  blue:   { bg: "#eff4fb", color: "#1a4f8a", border: "#bfdbfe", dot: "#1a4f8a" },
  orange: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa", dot: "#f97316" },
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
              sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: c.dot, flexShrink: 0 }}
            />
          )}
          {children}
        </Box>
      }
      sx={{
        height: 22,
        borderRadius: "11px",
        border: "1px solid",
        borderColor: c.border,
        bgcolor: c.bg,
        color: c.color,
        fontSize: "11.5px",
        fontWeight: 600,
        "& .MuiChip-label": { px: 1.25 },
      }}
    />
  )
}
