import type { ReactNode } from "react"
import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"

interface PanelBoxProps {
  title: string
  description?: string
  count?: number | string
  action?: ReactNode
  children: ReactNode
  noPadding?: boolean
}

export function PanelBox({ title, description, count, action, children, noPadding }: PanelBoxProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
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
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 500,
                lineHeight: 1.3,
                color: "text.primary",
              }}
            >
              {title}
            </Typography>
            {count !== undefined && (
              <Chip
                label={count}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "10px",
                  fontVariantNumeric: "tabular-nums",
                  bgcolor: "action.hover",
                  color: "text.secondary",
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            )}
          </Box>
          {description && (
            <Typography sx={{ mt: 0.5, fontSize: 12, color: "text.secondary" }}>
              {description}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>
      <Box sx={noPadding ? undefined : { p: 0 }}>
        {children}
      </Box>
    </Paper>
  )
}
