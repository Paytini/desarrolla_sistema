import type { ReactNode } from "react"
import { Box, Paper, Typography } from "@mui/material"

type SectionCardProps = {
  title: string
  description?: string
  action?: ReactNode
  disableContentPadding?: boolean
  children: ReactNode
}

export function SectionCard({ title, description, action, disableContentPadding, children }: SectionCardProps) {
  return (
    <Paper
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
          px: 3,
          py: 2,
          backgroundColor: '#F3F4F6',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: '"Outfit", system-ui, sans-serif',
              fontSize: '1rem',
              fontWeight: 700,
              color: '#111827',
            }}
          >
            {title}
          </Typography>
          {description && (
            <Typography sx={{ mt: 0.25, fontSize: '0.75rem', color: '#6B7280' }}>
              {description}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>
      <Box sx={disableContentPadding ? undefined : { p: 3 }}>{children}</Box>
    </Paper>
  )
}
