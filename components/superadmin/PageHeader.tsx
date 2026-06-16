import type { ReactNode } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"

interface PageHeaderProps {
  breadcrumb: string
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ breadcrumb, title, description, action }: PageHeaderProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
      <Box>
        <Typography
          sx={{
            fontSize: "10px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "text.secondary",
            lineHeight: 1,
          }}
        >
          {breadcrumb}
        </Typography>
        <Typography variant="h1" sx={{ mt: 0.5, fontSize: "22px", fontWeight: 600, lineHeight: 1.25 }}>
          {title}
        </Typography>
        {description && (
          <Typography sx={{ mt: 0.5, fontSize: "13px", color: "text.secondary" }}>
            {description}
          </Typography>
        )}
      </Box>
      {action && (
        <Box sx={{ flexShrink: 0, pt: 0.5 }}>
          {action}
        </Box>
      )}
    </Box>
  )
}
