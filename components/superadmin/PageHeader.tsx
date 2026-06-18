import type { ReactNode } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"

interface PageHeaderProps {
  breadcrumb?: string
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ breadcrumb: _breadcrumb, title, description, action }: PageHeaderProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
      <Box>
        <Typography variant="h1" sx={{ fontSize: "22px", fontWeight: 600, lineHeight: 1.25 }}>
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
