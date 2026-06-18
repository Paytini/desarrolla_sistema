import type { ReactNode } from "react"
import { Box, Divider, Paper, Typography } from "@mui/material"

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
        borderRadius: 0,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 2px 6px rgba(0,0,34,0.05), 0 0 1px rgba(0,0,34,0.04)",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: 3,
          py: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: "0.9375rem", fontWeight: 600, letterSpacing: "-0.01em", color: "text.primary" }}>
            {title}
          </Typography>
          {description && (
            <Typography sx={{ mt: 0.25, fontSize: "0.75rem", color: "text.secondary" }}>
              {description}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>
      <Divider />
      <Box sx={disableContentPadding ? undefined : { p: 3 }}>{children}</Box>
    </Paper>
  )
}
