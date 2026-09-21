import type { ReactNode } from "react"
import { Box, Paper, Typography } from "@mui/material"
import { fd, slate } from "@/lib/theme-tokens"

interface PanelBoxProps {
  title: string
  description?: string
  count?: number | string
  action?: ReactNode
  children: ReactNode
  noPadding?: boolean
  id?: string
}

export function PanelBox({
  title,
  description,
  count,
  action,
  children,
  noPadding,
  id,
}: PanelBoxProps) {
  return (
    <Paper
      id={id}
      elevation={0}
      sx={{
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: fd.background,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: 2.5,
          py: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: "1rem", fontWeight: 600, color: slate[900] }}>
            {title}
            {count !== undefined && (
              <Box
                component="span"
                sx={{ ml: 1, fontSize: "0.875rem", fontWeight: 400, color: slate[400] }}
              >
                {count}
              </Box>
            )}
          </Typography>
          {description && (
            <Typography sx={{ mt: 0.5, fontSize: "12px", color: slate[500] }}>
              {description}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>
      <Box sx={noPadding ? undefined : { p: 0 }}>{children}</Box>
    </Paper>
  )
}
