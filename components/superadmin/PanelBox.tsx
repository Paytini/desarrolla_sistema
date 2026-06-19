import type { ReactNode } from "react"
import { Box, Chip, Paper, Typography } from "@mui/material"
import { pg } from "@/lib/theme-tokens"

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
        borderRadius: '16px',
        border: `2px solid ${pg.ink}`,
        boxShadow: pg.shadow.md,
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
          backgroundColor: '#F8F4EC',
          borderBottom: `2px solid ${pg.ink}`,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              sx={{
                fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'text.primary',
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
                  backgroundColor: pg.violet,
                  color: '#FFFFFF',
                  border: `1.5px solid ${pg.ink}`,
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            )}
          </Box>
          {description && (
            <Typography sx={{ mt: 0.5, fontSize: '12px', color: 'text.secondary' }}>
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
