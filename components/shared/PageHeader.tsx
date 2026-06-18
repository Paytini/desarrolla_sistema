import type { ReactNode } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export default function PageHeader({ eyebrow: _eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2 }}>
      <Box>
        <Typography
          variant="h1"
          sx={{ fontSize: "26px", fontWeight: 700, lineHeight: 1.2 }}
        >
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ mt: 0.75, color: "text.secondary" }}>
            {description}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box sx={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 1 }}>
          {actions}
        </Box>
      )}
    </Box>
  )
}
