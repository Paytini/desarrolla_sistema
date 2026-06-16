import type { ReactNode } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"

interface SectionHeaderProps {
  title: string
  description?: string
  breadcrumb?: string
  action?: ReactNode
}

export function SectionHeader({ title, description, breadcrumb, action }: SectionHeaderProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2 }}>
      <Box>
        {breadcrumb && (
          <Typography
            sx={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "text.secondary",
              lineHeight: 1,
              mb: 0.5,
            }}
          >
            {breadcrumb}
          </Typography>
        )}
        <Typography sx={{ fontSize: "15px", fontWeight: 500, lineHeight: 1.35, color: "text.primary" }}>
          {title}
        </Typography>
        {description && (
          <Typography sx={{ mt: 0.5, fontSize: "13px", color: "text.secondary" }}>
            {description}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Box>
  )
}
