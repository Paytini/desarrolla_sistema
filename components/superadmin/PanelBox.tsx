import type { ReactNode } from "react"
import { Box, Chip, Paper, Typography } from "@mui/material"

interface PanelBoxProps {
  title: string
  description?: string
  count?: number | string
  action?: ReactNode
  children: ReactNode
  noPadding?: boolean
  id?: string
}

export function PanelBox({ title, description, count, action, children, noPadding, id }: PanelBoxProps) {
  return (
    <Paper
      id={id}
      elevation={0}
      sx={{
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: 2.5,
          py: 2,
          backgroundColor: '#F3F4F6',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              sx={{
                fontFamily: 'var(--font-outfit, "Outfit"), system-ui, sans-serif',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#111827',
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
                  fontSize: '11px',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 700,
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            )}
          </Box>
          {description && (
            <Typography sx={{ mt: 0.5, fontSize: '12px', color: '#6B7280' }}>
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
