import type { ReactNode } from "react"
import { Box, Chip, Paper, Typography } from "@mui/material"
import { fd, gray } from "@/lib/theme-tokens"

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
          backgroundColor: fd.muted,
          borderBottom: "1px solid var(--portal-border)",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              sx={{
                fontFamily: 'var(--font-outfit, "Outfit"), system-ui, sans-serif',
                fontSize: "1rem",
                fontWeight: 700,
                color: fd.foreground,
              }}
            >
              {title}
            </Typography>
            {count !== undefined && (
              <Chip
                label={count}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "11px",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 700,
                  backgroundColor: fd.primary,
                  color: fd.background,
                  border: "none",
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            )}
          </Box>
          {description && (
            <Typography sx={{ mt: 0.5, fontSize: "12px", color: gray[500] }}>
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
