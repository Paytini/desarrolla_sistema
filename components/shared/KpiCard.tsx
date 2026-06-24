import { Paper, Box, Typography } from "@mui/material"
import { RingChart } from "@/components/shared/RingChart"
import { fd } from "@/lib/theme-tokens"
import type { LucideIcon } from "lucide-react"

export type KpiBorderColor =
  | "violet" | "pink" | "amber" | "emerald" | "charcoal"
  | "blue" | "green" | "orange" | "rose" | "primary" | "destructive"

type KpiCardProps = {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  borderColor?: KpiBorderColor
  alert?: boolean
  ring?: number
}

const accentMap: Record<KpiBorderColor, { bg: string; text: string }> = {
  violet:      { bg: '#8B5CF6', text: '#FFFFFF' },
  pink:        { bg: '#F472B6', text: '#FFFFFF' },
  amber:       { bg: '#F59E0B', text: fd.foreground },
  emerald:     { bg: '#10B981', text: fd.foreground },
  charcoal:    { bg: fd.foreground, text: '#FFFFFF' },
  blue:        { bg: '#3B82F6', text: '#FFFFFF' },
  green:       { bg: '#10B981', text: fd.foreground },
  orange:      { bg: '#F59E0B', text: fd.foreground },
  rose:        { bg: '#EF4444', text: '#FFFFFF' },
  primary:     { bg: '#3B82F6', text: '#FFFFFF' },
  destructive: { bg: '#EF4444', text: '#FFFFFF' },
}

export default function KpiCard({ label, value, sub, icon: Icon, borderColor = "violet", alert = false, ring }: KpiCardProps) {
  const { bg, text } = accentMap[alert ? "destructive" : borderColor]

  const isLight       = text === fd.foreground
  const textSecondary = isLight ? 'rgba(17,24,39,0.6)' : 'rgba(255,255,255,0.7)'
  const ringArc       = isLight ? 'rgba(17,24,39,0.75)' : 'rgba(255,255,255,0.92)'
  const ringTrack     = isLight ? 'rgba(17,24,39,0.15)' : 'rgba(255,255,255,0.22)'

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '8px',
        backgroundColor: bg,
        overflow: 'hidden',
        transition: 'transform 200ms',
        '&:hover': { transform: 'scale(1.02)' },
      }}
    >
      <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
        <Box sx={{ mb: 2 }}>
          {ring !== undefined ? (
            <RingChart pct={ring} color={ringArc} trackColor={ringTrack} textColor={text} size={52} sw={5} />
          ) : Icon ? (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.2)',
                color: text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={20} strokeWidth={2.5} />
            </Box>
          ) : null}
        </Box>

        <Typography
          sx={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            mb: 0.5,
          }}
        >
          {label}
        </Typography>

        <Typography
          sx={{
            fontFamily: '"Outfit", system-ui, sans-serif',
            fontSize: '2rem',
            fontWeight: 800,
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
            color: text,
            mb: sub ? 0.5 : 0,
          }}
        >
          {value}
        </Typography>

        {sub && (
          <Typography sx={{ fontSize: '0.75rem', color: textSecondary }}>
            {sub}
          </Typography>
        )}
      </Box>
    </Paper>
  )
}
