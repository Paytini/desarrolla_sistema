import type { ReactNode } from "react"
import { Box, Paper, Typography } from "@mui/material"

type SectionCardProps = {
  title: string
  description?: string
  action?: ReactNode
  disableContentPadding?: boolean
  children: ReactNode
}

export function SectionCard({
  title,
  description,
  action,
  disableContentPadding,
  children,
}: SectionCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          px: 2.5,
          py: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontSize: 14, fontWeight: 600 }}>
            {title}
          </Typography>
          {description && (
            <Typography sx={{ mt: 0.25, fontSize: 12, color: "text.secondary" }}>
              {description}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>
      <Box sx={disableContentPadding ? undefined : { p: 2.5 }}>{children}</Box>
    </Paper>
  )
}
